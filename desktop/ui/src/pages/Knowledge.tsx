import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircleOutlined,
  CloudDownloadOutlined,
  CloudSyncOutlined,
  CloudUploadOutlined,
  CustomerServiceOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
  FireOutlined,
  GlobalOutlined,
  HddOutlined,
  InfoCircleOutlined,
  MailOutlined,
  PlusOutlined,
  PrinterOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  UploadOutlined,
  WarningOutlined,
  WindowsOutlined,
  CopyOutlined,
  ToolOutlined,
  CloseCircleOutlined,
  LinkOutlined,
  SafetyCertificateOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Checkbox,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Space,
  Tabs,
  Tag,
  Tooltip,
  message,
} from "antd";
import { fetchRemoteKnowledge, tryKnowledgeFix, openExternalUrl } from "../api";
import { useI18n } from "../i18n";
import type { KnowledgeFixResult } from "../types";
import "../knowledge.css";

export type SeverityLevel = "danger" | "urgent" | "warning" | "common";

export interface TroubleshootingItem {
  id: string;
  category: "system" | "network" | "hardware" | "printer" | "office";
  severity: SeverityLevel;
  title: string;
  errorCode?: string;
  symptom: string;
  causeSummary: string;
  fixActionName: string;
  fallbackAdvice: string;
  isCustom?: boolean;
}

import { BUILTIN_KNOWLEDGE_BASE } from "./builtinKnowledge";

const SEVERITY_CONFIG: Record<
  SeverityLevel,
  { label: string; tagColor: string; pillClass: string; icon: React.ReactNode }
> = {
  danger: {
    label: "危险级",
    tagColor: "error",
    pillClass: "pill-danger",
    icon: <CloseCircleOutlined />,
  },
  urgent: {
    label: "紧急级",
    tagColor: "warning",
    pillClass: "pill-urgent",
    icon: <FireOutlined />,
  },
  warning: {
    label: "重点级",
    tagColor: "gold",
    pillClass: "pill-warning",
    icon: <WarningOutlined />,
  },
  common: {
    label: "常见级",
    tagColor: "processing",
    pillClass: "pill-common",
    icon: <InfoCircleOutlined />,
  },
};

const CATEGORIES = [
  { key: "all", label: "全部问题", icon: <ToolOutlined /> },
  { key: "system", label: "系统与开机", icon: <WindowsOutlined /> },
  { key: "network", label: "上网与网络", icon: <GlobalOutlined /> },
  { key: "hardware", label: "硬盘与外设", icon: <HddOutlined /> },
  { key: "printer", label: "办公室打印机", icon: <PrinterOutlined /> },
  { key: "office", label: "办公与邮件", icon: <MailOutlined /> },
] as const;

const LOCAL_STORAGE_KEY = "qingshan_custom_knowledge_items_v1";

export default function KnowledgePage() {
  const { t, language } = useI18n();
  const [keyword, setKeyword] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const severityConfig: Record<
    SeverityLevel,
    { label: string; tagColor: string; pillClass: string; icon: React.ReactNode }
  > = useMemo(
    () => ({
      danger: {
        label: language === "en-US" ? "Critical" : "危险级",
        tagColor: "error",
        pillClass: "pill-danger",
        icon: <CloseCircleOutlined />,
      },
      urgent: {
        label: language === "en-US" ? "Urgent" : "紧急级",
        tagColor: "warning",
        pillClass: "pill-urgent",
        icon: <FireOutlined />,
      },
      warning: {
        label: language === "en-US" ? "Warning" : "重点级",
        tagColor: "gold",
        pillClass: "pill-warning",
        icon: <WarningOutlined />,
      },
      common: {
        label: language === "en-US" ? "Common" : "常见级",
        tagColor: "processing",
        pillClass: "pill-common",
        icon: <InfoCircleOutlined />,
      },
    }),
    [language],
  );

  const categories = useMemo(
    () => [
      { key: "all", label: language === "en-US" ? "All Issues" : "全部问题", icon: <ToolOutlined /> },
      { key: "system", label: language === "en-US" ? "OS & Boot" : "系统与开机", icon: <WindowsOutlined /> },
      { key: "network", label: language === "en-US" ? "Network & Internet" : "网络与联网", icon: <GlobalOutlined /> },
      { key: "hardware", label: language === "en-US" ? "Hardware & Disks" : "电脑硬件/磁盘", icon: <HddOutlined /> },
      { key: "printer", label: language === "en-US" ? "Printers & Peripherals" : "打印与外设", icon: <PrinterOutlined /> },
      { key: "office", label: language === "en-US" ? "Office Apps & Mail" : "办公与邮件", icon: <MailOutlined /> },
    ],
    [language],
  );
  const [customItems, setCustomItems] = useState<TroubleshootingItem[]>([]);
  const [fixingId, setFixingId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<TroubleshootingItem | null>(null);
  const [fixResult, setFixResult] = useState<KnowledgeFixResult | null>(null);
  const [showSupportModal, setShowSupportModal] = useState(false);

  // 模态框控制
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [remoteCheckLoading, setRemoteCheckLoading] = useState(false);
  const [remoteData, setRemoteData] = useState<{
    version: string;
    updatedAt: string;
    items: TroubleshootingItem[];
  } | null>(null);

  // 贡献上传模态框与运维通道控制
  const [showContribModal, setShowContribModal] = useState(false);
  const [contribToken, setContribToken] = useState<string>(() => localStorage.getItem("qs_gh_pat") || "");
  const [rememberToken, setRememberToken] = useState(true);
  const [selectedContribIds, setSelectedContribIds] = useState<string[]>([]);
  const [contribLoading, setContribLoading] = useState(false);
  const [contribSuccessUrl, setContribSuccessUrl] = useState<string | null>(null);
  const [browserIssueUrl, setBrowserIssueUrl] = useState<string | null>(null);
  const [includeAllLocalForContrib, setIncludeAllLocalForContrib] = useState(false);

  const [addForm] = Form.useForm();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 本地持久化加载
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // 保留所有非内置 30 条的条目（用户自建、手动导入、或从云端拉取合并的额外项）
          const builtinIds = new Set(BUILTIN_KNOWLEDGE_BASE.map((b) => b.id));
          setCustomItems(parsed.filter((i) => i && i.id && !builtinIds.has(i.id)));
        }
      }
    } catch {
      // 容错读取
    }
  }, []);

  // 重置回纯净的初始 30 条（便于用户反复测试云端拉取）
  const handleResetToBuiltin30 = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setCustomItems([]);
    setRemoteData(null);
    message.success(
      language === "en-US"
        ? "Reset to initial 30 base knowledge items! Ready to test pulling 60 items from cloud."
        : "已重置为初始 30 条基础故障库！现在可以测试从云端拉取 60 条。"
    );
  };

  // 保存本地持久化
  const saveCustomItems = (items: TroubleshootingItem[]) => {
    setCustomItems(items);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  };

  // 全量合并库（内置 + 本地自定义/合并项）
  const allItems = useMemo(() => {
    const map = new Map<string, TroubleshootingItem>();
    BUILTIN_KNOWLEDGE_BASE.forEach((i) => map.set(i.id, i));
    customItems.forEach((i) => map.set(i.id, i));
    return Array.from(map.values());
  }, [customItems]);

  const filteredItems = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return allItems.filter((item) => {
      if (selectedSeverity !== "all" && item.severity !== selectedSeverity) {
        return false;
      }
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        (item.errorCode && item.errorCode.toLowerCase().includes(q)) ||
        item.symptom.toLowerCase().includes(q) ||
        item.causeSummary.toLowerCase().includes(q) ||
        item.fixActionName.toLowerCase().includes(q)
      );
    });
  }, [allItems, keyword, selectedSeverity, selectedCategory]);

  // 打开求助弹窗
  const openSupportModal = () => {
    setDetailItem(null);
    setFixResult(null);
    setShowSupportModal(true);
  };

  // 打开大字详情弹窗
  const openDetailModal = (item: TroubleshootingItem, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setShowSupportModal(false);
    setDetailItem(item);
  };

  // 一键尝试修复
  const handleTryFix = async (item: TroubleshootingItem, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    try {
      setFixingId(item.id);
      const res = await tryKnowledgeFix(item.id);
      setFixResult(res);
    } catch (err) {
      setFixResult({
        success: false,
        title: item.title + (language === "en-US" ? " - Fix attempt error" : " - 修复尝试异常"),
        detail:
          language === "en-US"
            ? `System invocation error: ${String(err)}. This may be due to insufficient user privileges or group policy restrictions.`
            : `系统调用异常: ${String(err)}。可能因当前用户权限不足或策略限制。`,
        contactSupportTip: item.fallbackAdvice,
      });
    } finally {
      setFixingId(null);
    }
  };

  // 复制问题描述发给运维
  const handleCopyFaultReport = (item: TroubleshootingItem) => {
    const isEn = language === "en-US";
    const text = isEn
      ? [
          `[PC Issue Report]`,
          `Issue Title: ${item.title}`,
          item.errorCode ? `Related Code: ${item.errorCode}` : "",
          `Symptoms: ${item.symptom}`,
          `Likely Cause: ${item.causeSummary}`,
          `Status: Attempted one-click fix via Qingshan Toolbox, issue persists. Requesting IT support assistance.`,
        ]
          .filter(Boolean)
          .join("\n")
      : [
          `【办公电脑故障求助】`,
          `问题名称: ${item.title}`,
          item.errorCode ? `相关代码: ${item.errorCode}` : "",
          `电脑表现: ${item.symptom}`,
          `可能原因: ${item.causeSummary}`,
          `处理状态: 已通过青衫工具箱执行一键修复尝试，问题仍未恢复，麻烦运维老师协助处理。`,
        ]
          .filter(Boolean)
          .join("\n");

    void navigator.clipboard.writeText(text);
    message.success(
      isEn
        ? "Issue description copied to clipboard! Ready to paste to IT support."
        : "已复制问题说明，可直接微信/钉钉/飞书发给企业运维工程师"
    );
  };

  // 1. 手动添加新问题条目
  const handleAddCustomItem = async () => {
    try {
      const values = await addForm.validateFields();
      const newItem: TroubleshootingItem = {
        id: `custom_${Date.now()}`,
        category: values.category || "system",
        severity: values.severity || "common",
        title: values.title.trim(),
        errorCode: values.errorCode?.trim() || undefined,
        symptom: values.symptom.trim(),
        causeSummary: values.causeSummary.trim(),
        fixActionName:
          values.fixActionName?.trim() ||
          (language === "en-US" ? "Standard basic troubleshooting" : "常规基础排障尝试"),
        fallbackAdvice:
          values.fallbackAdvice?.trim() ||
          (language === "en-US"
            ? "If issue persists after fix, please contact enterprise IT desktop support."
            : "若修复后仍有问题，请直接联系企业 IT 桌面运维工程师处理。"),
        isCustom: true,
      };

      const updated = [newItem, ...customItems];
      saveCustomItems(updated);
      message.success(
        language === "en-US"
          ? `Successfully added issue record: "${newItem.title}"`
          : `成功添加问题记录: 「${newItem.title}」`
      );
      addForm.resetFields();
      setShowAddModal(false);
    } catch {
      // 表单校验提示
    }
  };

  // 删除自定义条目
  const handleDeleteCustomItem = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const updated = customItems.filter((item) => item.id !== id);
    saveCustomItems(updated);
    message.info(language === "en-US" ? "Custom record deleted" : "已删除该条自定义记录");
  };

  // 2. 导出资料库为 JSON 文件
  const handleExportKnowledge = () => {
    try {
      const exportPayload = {
        version: "1.1.2",
        exportDate: new Date().toISOString(),
        total: allItems.length,
        items: allItems,
      };
      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `qingshan-knowledge-v1.1.2-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      message.success(
        language === "en-US"
          ? `Successfully exported ${allItems.length} knowledge base records to JSON file!`
          : `已成功导出 ${allItems.length} 条资料库内容为 JSON 文件！`
      );
    } catch (err) {
      message.error(language === "en-US" ? `Export failed: ${String(err)}` : `导出失败: ${String(err)}`);
    }
  };

  // 2. 导入资料库 JSON 文件
  const handleImportKnowledge = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);
        const importedItems: TroubleshootingItem[] = Array.isArray(data)
          ? data
          : data?.items;

        if (!Array.isArray(importedItems)) {
          message.error(
            language === "en-US"
              ? "Import failed: file content is not a valid knowledge base format"
              : "导入失败：文件内容不是合法的资料库格式"
          );
          return;
        }

        // 合并去重导入
        let addedCount = 0;
        const existingIds = new Set(allItems.map((i) => i.id));
        const newItems: TroubleshootingItem[] = [];

        importedItems.forEach((item) => {
          if (item && item.title && item.symptom) {
            const finalId = item.id || `import_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            if (!existingIds.has(finalId)) {
              newItems.push({
                ...item,
                id: finalId,
                isCustom: true,
              });
              existingIds.add(finalId);
              addedCount++;
            }
          }
        });

        if (addedCount > 0) {
          const updated = [...newItems, ...customItems];
          saveCustomItems(updated);
          message.success(
            language === "en-US"
              ? `Successfully imported and merged ${addedCount} new fault records!`
              : `成功导入并合并 ${addedCount} 项全新故障记录！`
          );
        } else {
          message.info(
            language === "en-US"
              ? "Items in file already exist in local library. No changes made."
              : "导入的文件中条目已存在于本地资料库中，未发生变更。"
          );
        }
      } catch (err) {
        message.error(language === "en-US" ? `JSON parse error: ${String(err)}` : `解析 JSON 失败: ${String(err)}`);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  // 4. 从 GitHub 检查并拉取最新数据（支持用户自主选择）
  const handleCheckRemoteGitHub = async () => {
    setRemoteCheckLoading(true);
    setRemoteData(null);
    try {
      const ts = Date.now();
      // 多通道智能检测：官方 Raw 无缓存直连 -> 国内镜像代理加速 -> CDN 边缘分发 -> GitHub Contents API
      const sources = [
        `https://raw.githubusercontent.com/DragonTsunami/qingshan-toolbox/main/data/knowledge-community.json?t=${ts}`,
        `https://ghproxy.net/https://raw.githubusercontent.com/DragonTsunami/qingshan-toolbox/main/data/knowledge-community.json?t=${ts}`,
        `https://cdn.jsdelivr.net/gh/DragonTsunami/qingshan-toolbox@main/data/knowledge-community.json?t=${ts}`,
        `https://api.github.com/repos/DragonTsunami/qingshan-toolbox/contents/data/knowledge-community.json`,
      ];

      let bestPayload: { version: string; updatedAt: string; items: TroubleshootingItem[] } | null = null;
      let lastError = "";

      for (const url of sources) {
        try {
          const raw = await fetchRemoteKnowledge(url);
          if (!raw) continue;
          let parsed: any = null;
          try {
            parsed = JSON.parse(raw);
          } catch {
            continue;
          }

          // 兼容 GitHub REST API Base64 编码格式
          if (parsed && parsed.content && typeof parsed.content === "string") {
            try {
              const decodedStr = decodeURIComponent(
                escape(atob(parsed.content.replace(/\s/g, "")))
              );
              parsed = JSON.parse(decodedStr);
            } catch {
              // 忽略 base64 解码异常
            }
          }

          if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
            const candidate = {
              version: parsed.version || "1.1.2",
              updatedAt: parsed.updatedAt || "近期",
              items: parsed.items as TroubleshootingItem[],
            };
            // 择优策略：优先选取条目数量最全的有效数据（防止个别 CDN 缓存旧版本截断）
            if (!bestPayload || candidate.items.length > bestPayload.items.length) {
              bestPayload = candidate;
            }
            // 若条目数已达到 60 条全量以上，立即确认采用，避免不必要的网络轮询等待
            if (candidate.items.length >= 60) {
              break;
            }
          }
        } catch (e) {
          lastError = String(e);
        }
      }

      if (!bestPayload) {
        throw new Error(
          lastError ||
            (language === "en-US"
              ? "Unable to reach remote knowledge base, please check network"
              : "无法连通 GitHub 远程知识库，请检查网络设置")
        );
      }

      setRemoteData(bestPayload);
      message.success(
        language === "en-US"
          ? `Detected GitHub cloud library (${bestPayload.items.length} records)!`
          : `成功检测到 GitHub 云端资料库 (共 ${bestPayload.items.length} 条案例)！`
      );
    } catch (err) {
      message.error(
        language === "en-US"
          ? `Failed to check cloud updates: ${String(err)}`
          : `检查云端更新失败: ${String(err)}`
      );
    } finally {
      setRemoteCheckLoading(false);
    }
  };

  // 用户自主选择确认拉取合并
  const handleConfirmPullRemote = () => {
    if (!remoteData || !remoteData.items) return;
    let newCount = 0;
    const existingIds = new Set(allItems.map((i) => i.id));
    const mergedList: TroubleshootingItem[] = [];

    remoteData.items.forEach((item) => {
      if (!existingIds.has(item.id)) {
        mergedList.push({
          ...item,
          isCustom: true,
        });
        existingIds.add(item.id);
        newCount++;
      }
    });

    if (newCount > 0) {
      const updated = [...mergedList, ...customItems];
      saveCustomItems(updated);
      message.success(
        language === "en-US"
          ? `Pulled and merged ${newCount} records from cloud. Local now has ${allItems.length + newCount} total!`
          : `已拉取并成功合并 ${newCount} 条云端最新故障指南，本地现有 ${allItems.length + newCount} 条！`
      );
    } else {
      message.info(
        language === "en-US"
          ? "Your local library already has all cloud items, no pull needed."
          : "您的本地资料库已拥有云端的全部条目，无需额外拉取。"
      );
    }
    setShowSyncModal(false);
    setRemoteData(null);
  };

  // 4. 用户/企业运维把问题上传贡献至 GitHub（打开向导与多通道上传模态框）
  const handleUploadContributionToGitHub = () => {
    if (customItems.length > 0) {
      setSelectedContribIds(customItems.map((i) => i.id));
      setIncludeAllLocalForContrib(false);
    } else {
      setSelectedContribIds(allItems.slice(0, 3).map((i) => i.id));
      setIncludeAllLocalForContrib(true);
    }
    setContribSuccessUrl(null);
    setBrowserIssueUrl(null);
    setShowContribModal(true);
  };

  // 4.1 企业运维通道：直接调用 GitHub API 提交 Issue
  const handleDirectApiSubmit = async () => {
    if (!contribToken.trim()) {
      message.warning(
        language === "en-US"
          ? "Please enter your GitHub Personal Access Token (PAT)"
          : "请输入您的 GitHub Personal Access Token (PAT)"
      );
      return;
    }
    const candidatePool = includeAllLocalForContrib ? allItems : (customItems.length > 0 ? customItems : allItems);
    const itemsToSubmit = candidatePool.filter((i) => selectedContribIds.includes(i.id));
    if (itemsToSubmit.length === 0) {
      message.warning(
        language === "en-US"
          ? "Please select at least 1 record to contribute"
          : "请至少勾选 1 条待贡献的问题记录"
      );
      return;
    }

    setContribLoading(true);
    try {
      const jsonStr = JSON.stringify(itemsToSubmit, null, 2);
      const isEn = language === "en-US";
      const title = isEn
        ? `[Knowledge Contribution] Admin submitted ${itemsToSubmit.length} new issue guides`
        : `[知识库贡献] 运维提交 ${itemsToSubmit.length} 条新运维问题指南`;
      const body = isEn
        ? `### Knowledge Contribution Data Package\n\n\`\`\`json\n${jsonStr}\n\`\`\`\n\n- **Client:** Qingshan Toolbox Desktop (v1.1.2)\n- **Count:** ${itemsToSubmit.length} items\n- **Submitted:** ${new Date().toLocaleString()}\n\nThank you for contributing to open-source IT support knowledge base!`
        : `### 运维贡献数据包\n\n\`\`\`json\n${jsonStr}\n\`\`\`\n\n- **提交来源：** 青衫工具箱客户端 (v1.1.2)\n- **案例数量：** ${itemsToSubmit.length} 条\n- **提交时间：** ${new Date().toLocaleString()}\n\n感谢为开源桌面运维与IT支持资料库做出贡献！`;

      const res = await fetch("https://api.github.com/repos/DragonTsunami/qingshan-toolbox/issues", {
        method: "POST",
        headers: {
          "Accept": "application/vnd.github+json",
          "Authorization": `Bearer ${contribToken.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          body,
          labels: ["knowledge-contrib"],
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      if (rememberToken) {
        localStorage.setItem("qs_gh_pat", contribToken.trim());
      } else {
        localStorage.removeItem("qs_gh_pat");
      }
      setContribSuccessUrl(data.html_url);
      message.success(
        language === "en-US"
          ? "🎉 Submission successful! GitHub Issue created!"
          : "🎉 提交成功！GitHub Issue 已创建！"
      );
    } catch (err) {
      message.error(
        language === "en-US" ? `Submission failed: ${String(err)}` : `提交失败: ${String(err)}`
      );
    } finally {
      setContribLoading(false);
    }
  };

  // 4.2 通道二核心：一键导出贡献文件并拉起 GitHub Issue 提交页
  const handleExportAndOpenIssue = async () => {
    const candidatePool = includeAllLocalForContrib ? allItems : (customItems.length > 0 ? customItems : allItems);
    const itemsToSubmit = candidatePool.filter((i) => selectedContribIds.includes(i.id));
    if (itemsToSubmit.length === 0) {
      message.warning(
        language === "en-US"
          ? "Please select at least 1 record to contribute"
          : "请至少勾选 1 条待贡献的问题记录"
      );
      return;
    }
    const count = itemsToSubmit.length;
    const jsonStr = JSON.stringify(itemsToSubmit, null, 2);

    // 1. 导出并触发浏览器下载 JSON 格式文件
    try {
      const exportData = {
        version: "1.1.2",
        exportTime: new Date().toISOString(),
        type: "qingshan-knowledge-contribution",
        total: count,
        items: itemsToSubmit,
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `qingshan-knowledge-contrib-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.warn("Export download error:", e);
    }

    // 2. 复制标准化格式到剪贴板
    const isEn = language === "en-US";
    const issueBody = isEn
      ? `### Contributor Submitted Issue Records\n\n\`\`\`json\n${jsonStr}\n\`\`\`\n\n- **Source:** Qingshan Toolbox Desktop (v1.1.2)\n- **Count:** ${count} items\n- **Time:** ${new Date().toLocaleString()}\n\nThank you for contributing to open-source IT support knowledge base!`
      : `### 贡献者提交的新问题记录\n\n\`\`\`json\n${jsonStr}\n\`\`\`\n\n- **提交来源：** 青衫工具箱客户端 (v1.1.2)\n- **案例数量：** ${count} 条\n- **提交时间：** ${new Date().toLocaleString()}\n\n感谢为开源桌面运维与IT支持资料库做出贡献！`;
    try {
      await navigator.clipboard.writeText(issueBody);
    } catch (e) {
      console.warn("Clipboard copy fallback:", e);
    }

    // 3. 构建安全可执行的 Issue URL
    const titleParam = encodeURIComponent(
      isEn
        ? `[Knowledge Contribution] Submit ${count} new issue cases`
        : `[知识库贡献] 提交 ${count} 条新问题案例`
    );
    const shortUrl = `https://github.com/DragonTsunami/qingshan-toolbox/issues/new?title=${titleParam}`;
    setBrowserIssueUrl(shortUrl);

    message.success(
      isEn
        ? `Exported ${count} items & copied to clipboard! Opening GitHub Issue page...`
        : `已导出 ${count} 条案例文件并复制到剪贴板！正在为您拉起 GitHub Issue 提交页面...`
    );

    // 4. 打开 GitHub Issue 页面
    await openExternalUrl(shortUrl);
  };

  // 4.3 离线文件导出通道
  const handleExportSelectedContrib = () => {
    const candidatePool = includeAllLocalForContrib ? allItems : (customItems.length > 0 ? customItems : allItems);
    const itemsToSubmit = candidatePool.filter((i) => selectedContribIds.includes(i.id));
    if (itemsToSubmit.length === 0) {
      message.warning(
        language === "en-US"
          ? "Please select at least 1 record to export"
          : "请至少勾选 1 条待导出的案例"
      );
      return;
    }
    const count = itemsToSubmit.length;
    try {
      const exportData = {
        version: "1.1.2",
        exportTime: new Date().toISOString(),
        type: "qingshan-knowledge-contribution",
        total: count,
        items: itemsToSubmit,
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qingshan-knowledge-contrib-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      message.success(
        language === "en-US"
          ? `Exported ${count} selected records to JSON file!`
          : `已成功导出 ${count} 条选中的案例为 JSON 文件！`
      );
    } catch (e) {
      message.error(
        language === "en-US" ? `Export failed: ${String(e)}` : `导出失败: ${String(e)}`
      );
    }
  };

  return (
    <div className="kb-container">
      {/* 隐藏的导入文件 input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        accept=".json"
        onChange={handleImportKnowledge}
      />

      {/* 顶部置顶搜索与双重过滤面板 */}
      <section className="kb-header-card">
        <div className="kb-search-row">
          <Input
            className="kb-search-input"
            prefix={<SearchOutlined style={{ color: "var(--muted)", marginRight: 6 }} />}
            placeholder="搜索您遇到的电脑问题、报错代码 (如 0x11b, 蓝屏, 投屏, 耳机没声音, 微信能上网页打不开, 临时配置)..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            allowClear
            size="large"
          />

          <div className="kb-toolbar-group">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowAddModal(true)}
              style={{ borderRadius: 8, height: 40 }}
            >
              {language === "en-US" ? "Add Record" : "新增记录"}
            </Button>

            <Tooltip title={language === "en-US" ? "Export knowledge base to JSON backup" : "将当前资料库导出备份为 JSON 文件"}>
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExportKnowledge}
                style={{ borderRadius: 8, height: 40 }}
              >
                {t("导出")}
              </Button>
            </Tooltip>

            <Tooltip title={language === "en-US" ? "Import and merge JSON knowledge base file" : "从外部导入 JSON 格式资料库内容并合并"}>
              <Button
                icon={<UploadOutlined />}
                onClick={() => fileInputRef.current?.click()}
                style={{ borderRadius: 8, height: 40 }}
              >
                {t("导入")}
              </Button>
            </Tooltip>

            <Tooltip title={language === "en-US" ? "Pull latest items from GitHub or contribute" : "通过 GitHub 拉取最新资料或上传您的贡献"}>
              <Button
                icon={<CloudSyncOutlined />}
                onClick={() => setShowSyncModal(true)}
                style={{ borderRadius: 8, height: 40 }}
              >
                {language === "en-US" ? "GitHub Sync" : "GitHub云端同步"}
              </Button>
            </Tooltip>

            <Button
              type="default"
              icon={<CustomerServiceOutlined />}
              onClick={openSupportModal}
              style={{ borderRadius: 8, height: 40 }}
            >
              {language === "en-US" ? "Contact Support" : "联系运维"}
            </Button>
          </div>
        </div>

        <div className="kb-filters-container">
          {/* 第一组：级别过滤 */}
          <div className="kb-filter-row">
            <div className="kb-filter-group">
              <span className="kb-filter-label">{language === "en-US" ? "Severity:" : "问题级别:"}</span>
              <span
                className={`kb-pill${selectedSeverity === "all" ? " active" : ""}`}
                onClick={() => setSelectedSeverity("all")}
              >
                {language === "en-US" ? "All" : "全部"} ({allItems.length})
              </span>
              {(["danger", "urgent", "warning", "common"] as SeverityLevel[]).map((sev) => {
                const conf = severityConfig[sev];
                const count = allItems.filter((i) => i.severity === sev).length;
                return (
                  <span
                    key={sev}
                    className={`kb-pill ${conf.pillClass}${selectedSeverity === sev ? " active" : ""}`}
                    onClick={() => setSelectedSeverity(sev)}
                  >
                    {conf.icon} <span>{conf.label}</span> ({count})
                  </span>
                );
              })}
            </div>

            <div className="kb-stat-text">
              {language === "en-US"
                ? `Found ${filteredItems.length} / ${allItems.length} guides`
                : `找到 ${filteredItems.length} / ${allItems.length} 个常见问题指南`}
              {customItems.length > 0 && (
                <span style={{ marginLeft: 8, color: "#9254de" }}>
                  {language === "en-US"
                    ? `(including ${customItems.length} custom/imported)`
                    : `(包含 ${customItems.length} 条自定义/导入记录)`}
                </span>
              )}
            </div>
          </div>

          {/* 第二组：分类过滤 */}
          <div className="kb-filter-row">
            <div className="kb-filter-group">
              <span className="kb-filter-label">{language === "en-US" ? "Category:" : "场景分类:"}</span>
              {categories.map((cat) => (
                <span
                  key={cat.key}
                  className={`kb-pill${selectedCategory === cat.key ? " active" : ""}`}
                  onClick={() => setSelectedCategory(cat.key)}
                >
                  {cat.icon} <span>{cat.label}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 一排三列网格布局：纯粹直观，用户一眼明白问题 */}
      {filteredItems.length === 0 ? (
        <div className="kb-empty">
          <Empty
            description={
              <span>
                未找到包含 "<strong>{keyword}</strong>" 的问题说明，您可以尝试输入 蓝屏、打印机、或点击右上角【➕ 新增记录】添加
              </span>
            }
          />
        </div>
      ) : (
        <div className="kb-grid">
          {filteredItems.map((item) => {
            const conf = severityConfig[item.severity];
            const isFixing = fixingId === item.id;
            return (
              <article
                key={item.id}
                className="kb-card"
                onClick={(e) => openDetailModal(item, e)}
              >
                <div className="kb-card-top">
                  {/* 头部：级别 Badge + 自定义 Tag + 错误代码 Tag */}
                  <div className="kb-card-head">
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Tag color={conf.tagColor} style={{ marginRight: 0, fontWeight: 500 }}>
                        {conf.icon} {conf.label}
                      </Tag>
                      {item.isCustom && (
                        <Tag className="kb-tag-custom" style={{ marginRight: 0, fontWeight: 500 }}>
                          {language === "en-US" ? "Custom" : "用户自建"}
                        </Tag>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {item.errorCode && (
                        <Tag
                          bordered={false}
                          color="default"
                          style={{ fontFamily: "var(--font-code)", fontSize: 11, maxWidth: 140 }}
                        >
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", display: "inline-block" }}>
                            {item.errorCode}
                          </span>
                        </Tag>
                      )}
                      {item.isCustom && (
                        <Popconfirm
                          title={language === "en-US" ? "Delete this custom record?" : "确认删除该条自定义记录？"}
                          onConfirm={(e) => handleDeleteCustomItem(item.id, e)}
                          okText={t("删除")}
                          cancelText={t("取消")}
                        >
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={(e) => e.stopPropagation()}
                            title={language === "en-US" ? "Delete custom record" : "删除自定义条目"}
                          />
                        </Popconfirm>
                      )}
                    </div>
                  </div>

                  {/* 标题：直截了当的问题名 */}
                  <h3 className="kb-card-title">{item.title}</h3>

                  {/* 电脑表现现象：面向用户 */}
                  <Tooltip title={item.symptom} placement="topLeft" mouseEnterDelay={0.4}>
                    <div className="kb-error-box">{item.symptom}</div>
                  </Tooltip>

                  {/* 通俗原因解释：非高深运维术语 */}
                  <div className="kb-reason-box">{item.causeSummary}</div>
                </div>

                {/* 卡片底部操作栏：一键修复尝试核心主操作 */}
                <div className="kb-card-bottom">
                  <div className="kb-action-row">
                    <Button
                      type="primary"
                      className="kb-fix-btn"
                      icon={<ThunderboltOutlined />}
                      loading={isFixing}
                      onClick={(e) => handleTryFix(item, e)}
                    >
                      {isFixing
                        ? (language === "en-US" ? "Attempting fix..." : "正在尝试修复...")
                        : (language === "en-US" ? "Try Fix" : "一键修复尝试")}
                    </Button>
                    <Button
                      type="default"
                      icon={<CopyOutlined />}
                      title={language === "en-US" ? "Copy report for IT support" : "复制问题描述发给运维"}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleCopyFaultReport(item);
                      }}
                    >
                      {language === "en-US" ? "Copy" : "复制描述"}
                    </Button>
                  </div>

                  <div className="kb-footer-tips">
                    <span>{language === "en-US" ? "💡 Click card for full details" : "💡 点击卡片可查看大字版说明"}</span>
                    <span style={{ color: "var(--accent)" }}>{language === "en-US" ? "View Details ➔" : "查看说明 ➔"}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* 1. 手动添加新问题条目 Modal */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <PlusOutlined style={{ color: "var(--accent)" }} />
            <span>{language === "en-US" ? "Add Custom Issue Record" : "手动添加未收录的电脑问题记录"}</span>
          </div>
        }
        open={showAddModal}
        onCancel={() => setShowAddModal(false)}
        onOk={handleAddCustomItem}
        okText={language === "en-US" ? "Save to Local Library" : "保存到本地资料库"}
        cancelText={t("取消")}
        width={620}
        zIndex={1200}
        destroyOnClose
      >
        <Form form={addForm} layout="vertical" style={{ marginTop: 14 }}>
          <Form.Item
            name="title"
            label={language === "en-US" ? "Issue Title / Fault Summary" : "问题名称 / 故障标题"}
            rules={[{ required: true, message: language === "en-US" ? "Please enter an intuitive issue title" : "请输入直观的问题标题" }]}
          >
            <Input
              placeholder={
                language === "en-US"
                  ? "e.g. External drive not recognized, Office app crash..."
                  : "例如：插入移动硬盘不识别、某办公软件打不开等..."
              }
            />
          </Form.Item>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Form.Item
              name="severity"
              label={language === "en-US" ? "Severity Level" : "问题严重级别"}
              initialValue="common"
            >
              <Select
                options={[
                  {
                    label: language === "en-US" ? "🟢 Common (Minor / Workaround)" : "🟢 常见级 (轻微/单机可绕过)",
                    value: "common",
                  },
                  {
                    label: language === "en-US" ? "🟡 Warning (Productivity impact)" : "🟡 重点级 (影响工作效率)",
                    value: "warning",
                  },
                  {
                    label: language === "en-US" ? "🟠 Urgent (Work blocked)" : "🟠 紧急级 (无法正常办公)",
                    value: "urgent",
                  },
                  {
                    label: language === "en-US" ? "🔴 Critical (BSOD / Disk failure / Virus)" : "🔴 危险级 (蓝屏/掉盘/病毒)",
                    value: "danger",
                  },
                ]}
              />
            </Form.Item>

            <Form.Item
              name="category"
              label={language === "en-US" ? "Category" : "所属业务场景"}
              initialValue="system"
            >
              <Select
                options={[
                  { label: language === "en-US" ? "OS & Boot" : "系统与开机", value: "system" },
                  { label: language === "en-US" ? "Network & Internet" : "上网与网络", value: "network" },
                  { label: language === "en-US" ? "Hardware & Disks" : "硬盘与外设", value: "hardware" },
                  { label: language === "en-US" ? "Printers & Peripherals" : "办公室打印机", value: "printer" },
                  { label: language === "en-US" ? "Office Apps & Mail" : "办公与邮件", value: "office" },
                ]}
              />
            </Form.Item>
          </div>

          <Form.Item
            name="errorCode"
            label={language === "en-US" ? "Error Code / Popup Keywords (Optional)" : "相关错误代码 / 弹窗关键字 (选填)"}
          >
            <Input
              placeholder={
                language === "en-US"
                  ? "e.g. 0x80070005, Access Denied..."
                  : "例如：0x80070005、Access Denied..."
              }
            />
          </Form.Item>

          <Form.Item
            name="symptom"
            label={language === "en-US" ? "Observed Symptoms (Layman description)" : "电脑具体表现出的症状 (普通人能看懂的表现)"}
            rules={[
              {
                required: true,
                message: language === "en-US" ? "Please describe the symptoms in detail" : "请详细描述电脑出现了什么异常",
              },
            ]}
          >
            <Input.TextArea
              rows={2}
              placeholder={
                language === "en-US"
                  ? "e.g. Double-clicking icon does nothing, task manager shows process briefly..."
                  : "例如：双击图标后毫无反应，任务管理器里进程一闪而过..."
              }
            />
          </Form.Item>

          <Form.Item
            name="causeSummary"
            label={language === "en-US" ? "Root Cause Summary (Why it happens)" : "为什么会出现这个情况 (原因解释)"}
            rules={[
              {
                required: true,
                message: language === "en-US" ? "Please summarize the likely cause" : "请简要说明可能的原因",
              },
            ]}
          >
            <Input.TextArea
              rows={2}
              placeholder={
                language === "en-US"
                  ? "e.g. Missing VC++ runtime, or blocked by security software..."
                  : "例如：缺少特定运行时库组件，或者被第三方杀毒误杀拦截..."
              }
            />
          </Form.Item>

          <Form.Item
            name="fixActionName"
            label={language === "en-US" ? "One-Click Fix Action Name (Optional)" : "一键修复动作名称 (选填)"}
            initialValue={language === "en-US" ? "Standard system service & cache refresh" : "常规系统服务与缓存刷新"}
          >
            <Input
              placeholder={
                language === "en-US"
                  ? "e.g. Reset network stack, restart audio service, clear cache..."
                  : "例如：重置网络栈、重启音频服务、清空缓存..."
              }
            />
          </Form.Item>

          <Form.Item
            name="fallbackAdvice"
            label={language === "en-US" ? "Fallback Guidance If Fix Fails (Optional)" : "若一键修复仍无法解决的指引 (选填)"}
          >
            <Input
              placeholder={
                language === "en-US"
                  ? "e.g. Please contact IT support to reinstall runtime components..."
                  : "例如：请联系企业 IT 运维老师协助重新安装对应运行时..."
              }
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 4. GitHub 云端同步中心 Modal (包含拉取与贡献上传，用户自主选择) */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CloudSyncOutlined style={{ color: "var(--accent)", fontSize: 18 }} />
            <span>{language === "en-US" ? "GitHub Cloud Knowledge Base Sync Center" : "GitHub 云端资料库同步中心"}</span>
          </div>
        }
        open={showSyncModal}
        onCancel={() => {
          setShowSyncModal(false);
          setRemoteData(null);
        }}
        footer={[
          <Button key="close" onClick={() => setShowSyncModal(false)}>
            {t("关闭")}
          </Button>,
        ]}
        width={650}
        zIndex={1200}
        destroyOnClose
      >
        <div className="kb-sync-panel" style={{ marginTop: 14 }}>
          {/* 拉取板块 */}
          <div className="kb-sync-card">
            <div className="kb-sync-card-title">
              <CloudDownloadOutlined style={{ color: "#1677ff", fontSize: 16 }} />
              <span>{language === "en-US" ? "Pull Latest Knowledge Updates from GitHub" : "从 GitHub 拉取最新资料库更新"}</span>
            </div>
            <div className="kb-sync-card-desc">
              {language === "en-US"
                ? "Automatically checks the latest issue library maintained by community and IT experts. You decide whether to merge locally, never forcibly overwritten."
                : "自动检索由官方与全球企业运维维护的最新故障库。您可以自主决定是否合并到本地，绝不强制覆盖。"}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Button
                type="primary"
                loading={remoteCheckLoading}
                onClick={handleCheckRemoteGitHub}
              >
                {language === "en-US" ? "Check Remote GitHub Library" : "检查云端最新故障库"}
              </Button>
            </div>

            {remoteData && (
              <div
                style={{
                  marginTop: 10,
                  padding: "12px 14px",
                  background: "var(--panel)",
                  borderRadius: 8,
                  border: "1px dashed var(--accent)",
                }}
              >
                <div style={{ fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
                  {language === "en-US"
                    ? `☁️ Detected GitHub Cloud Library: v${remoteData.version} (Updated: ${remoteData.updatedAt})`
                    : `☁️ 检测到 GitHub 云端资料库: v${remoteData.version} (发布于 ${remoteData.updatedAt})`}
                </div>
                <div style={{ fontSize: 13, color: "var(--text)", marginBottom: 6 }}>
                  • {language === "en-US" ? "Local items:" : "本地现有条目:"} <strong>{allItems.length}</strong> {language === "en-US" ? "items" : "条"}<br />
                  • {language === "en-US" ? "Cloud items:" : "云端共有条目:"} <strong>{remoteData.items.length}</strong> {language === "en-US" ? "items" : "条"}<br />
                  • {language === "en-US" ? "New items to pull:" : "可拉取新增条目:"} <strong style={{ color: "#52c41a" }}>{Math.max(0, remoteData.items.length - allItems.length)}</strong> {language === "en-US" ? "items" : "条"}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--text-2)", marginBottom: 12 }}>
                  {language === "en-US"
                    ? "Do you want to pull and merge these latest fault records into your local toolbox?"
                    : "您是否选择拉取并合并这批最新故障库至您本地的工具箱中？"}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Button type="primary" onClick={handleConfirmPullRemote}>
                    {language === "en-US"
                      ? `Confirm Pull & Merge (${remoteData.items.length} items)`
                      : `确认拉取并合并到本地 (${remoteData.items.length} 条)`}
                  </Button>
                  <Button onClick={() => setRemoteData(null)}>
                    {language === "en-US"
                      ? `Keep Local (${allItems.length} items)`
                      : `暂不拉取 (保留本地 ${allItems.length} 条)`}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* 上传贡献板块 */}
          <div className="kb-sync-card">
            <div className="kb-sync-card-title">
              <CloudUploadOutlined style={{ color: "#52c41a", fontSize: 16 }} />
              <span>{language === "en-US" ? "Contribute Local Issues to GitHub" : "上传贡献您本地记录的问题至 GitHub"}</span>
            </div>
            <div className="kb-sync-card-desc">
              {language === "en-US"
                ? "If you have recorded uncatalogued issues locally, you can submit them to GitHub Issues to help more users and IT admins solve similar problems!"
                : "如果您在本地添加了未收录的罕见故障或办公痛点，可一键提交至 GitHub 官方仓库 Issue，帮助更多企业员工与运维解决类似问题！"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Button
                icon={<CloudUploadOutlined />}
                onClick={handleUploadContributionToGitHub}
              >
                {language === "en-US" ? "Contribute Local Records to GitHub" : "一键向 GitHub 仓库贡献本地新记录"}
              </Button>
            </div>
          </div>

          {/* 测试辅助：一键重置回 30 条测试基线 */}
          <div style={{ padding: "10px 14px", background: "var(--bg-soft)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              {language === "en-US"
                ? "🧪 Test helper: Reset local library back to initial 30 items baseline"
                : "🧪 测试专用：若需要重新测试拉取效果，可一键重置本地为初始 30 条基线"}
            </span>
            <Popconfirm
              title={
                language === "en-US"
                  ? "Reset merged entries back to initial 30 baseline items?"
                  : "确定清空本地已合并的条目，重置为初始 30 条吗？"
              }
              onConfirm={handleResetToBuiltin30}
              okText={t("重置")}
              cancelText={t("取消")}
            >
              <Button size="small" danger>
                {language === "en-US" ? "Reset to initial 30" : "重置回初始 30 条"}
              </Button>
            </Popconfirm>
          </div>
        </div>
      </Modal>

      {/* 5. GitHub 资料库贡献与上传中心向导 Modal */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CloudUploadOutlined style={{ color: "#52c41a", fontSize: 18 }} />
            <span>{language === "en-US" ? "Contribute & Upload Records to GitHub Knowledge Base" : "向 GitHub 官方资料库贡献与上传问题记录"}</span>
          </div>
        }
        open={showContribModal}
        onCancel={() => setShowContribModal(false)}
        footer={[
          <Button key="close" onClick={() => setShowContribModal(false)}>
            {language === "en-US" ? "Close Wizard" : "关闭向导"}
          </Button>,
        ]}
        width={720}
        zIndex={1400}
        destroyOnClose
      >
        <div style={{ marginTop: 12 }}>
          {customItems.length === 0 ? (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 14 }}
              message={language === "en-US" ? "Local library has standard baseline issues (30 items)" : "本地当前为纯净的初始故障库（共 30 条）"}
              description={
                <div>
                  {language === "en-US"
                    ? "You haven't recorded uncatalogued issues yet. If you run into new issues, click below to record them, or check existing local items to test the contribution flow."
                    : "您当前尚未在本地录入未收录的罕见故障。若您在办公运维中遇到了新问题，可以点击下方按钮进行录入；或者勾选本地已有条目进行提交流程测试。"}
                  <div style={{ marginTop: 8 }}>
                    <Button
                      size="small"
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        setShowContribModal(false);
                        setShowSyncModal(false);
                        setShowAddModal(true);
                      }}
                    >
                      {language === "en-US" ? "➕ Record New Issue Now" : "➕ 立即录入新遇到的故障记录"}
                    </Button>
                  </div>
                </div>
              }
            />
          ) : (
            <Alert
              type="success"
              showIcon
              style={{ marginBottom: 14 }}
              message={
                language === "en-US"
                  ? `Detected ${customItems.length} custom/recorded items locally`
                  : `检测到本地有 ${customItems.length} 条已录入/自建条目`
              }
              description={
                language === "en-US"
                  ? "Select items you wish to submit. After review and merge, they will be included in the open-source library to help more users!"
                  : "您可以勾选想要提交到云端仓库的条目。审核合并后将收录进开源知识库，帮助更多企业员工自愈排障！"
              }
            />
          )}

          {/* 待提交条目勾选区 */}
          <div
            style={{
              maxHeight: 140,
              overflowY: "auto",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 16,
              background: "var(--bg-soft)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
                paddingBottom: 4,
                borderBottom: "1px dashed var(--border)",
              }}
            >
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>
                {language === "en-US"
                  ? `Select issue records to submit (${selectedContribIds.length} selected):`
                  : `选择待提交的问题记录（已勾选 ${selectedContribIds.length} 条）：`}
              </span>
              <Space size="middle">
                <Checkbox
                  checked={includeAllLocalForContrib}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIncludeAllLocalForContrib(checked);
                    if (checked) {
                      setSelectedContribIds(allItems.map((i) => i.id));
                    } else {
                      setSelectedContribIds(customItems.map((i) => i.id));
                    }
                  }}
                >
                  <span style={{ fontSize: 12 }}>{language === "en-US" ? "Show all items" : "显示全部条目"}</span>
                </Checkbox>
                <a
                  style={{ fontSize: 12 }}
                  onClick={() =>
                    setSelectedContribIds(
                      (includeAllLocalForContrib
                        ? allItems
                        : customItems.length > 0
                        ? customItems
                        : allItems
                      ).map((i) => i.id)
                    )
                  }
                >
                  {t("全选")}
                </a>
                <a style={{ fontSize: 12 }} onClick={() => setSelectedContribIds([])}>
                  {t("清空")}
                </a>
              </Space>
            </div>
            {(includeAllLocalForContrib
              ? allItems
              : customItems.length > 0
              ? customItems
              : allItems
            ).map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "4px 0",
                  fontSize: 12.5,
                }}
              >
                <Checkbox
                  checked={selectedContribIds.includes(item.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedContribIds([...selectedContribIds, item.id]);
                    } else {
                      setSelectedContribIds(selectedContribIds.filter((id) => id !== item.id));
                    }
                  }}
                >
                  <span style={{ fontWeight: 500, color: "var(--text)" }}>{item.title}</span>
                </Checkbox>
                <Space size="small">
                  <Tag style={{ margin: 0, fontSize: 11 }}>{item.category}</Tag>
                  <Tag
                    color={severityConfig[item.severity].tagColor}
                    style={{ margin: 0, fontSize: 11 }}
                  >
                    {severityConfig[item.severity].label}
                  </Tag>
                </Space>
              </div>
            ))}
          </div>

          {/* 上传通道 Tabs */}
          <Tabs
            defaultActiveKey="api"
            items={[
              {
                key: "api",
                label: (
                  <span>
                    <SafetyCertificateOutlined style={{ marginRight: 4 }} />
                    {language === "en-US" ? "Channel 1: IT Admin / Direct Token API" : "通道一：企业运维 / Token 一键直传"}
                  </span>
                ),
                children: (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "4px 0" }}>
                    <div style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.6 }}>
                      {language === "en-US"
                        ? "Suitable for IT admins or pros. Enter GitHub PAT to submit Issue via background REST API directly without opening browser."
                        : "适合企业 IT 运维工程师或专业人士。输入您的 GitHub Personal Access Token (PAT)，直接在后台调用 REST API 极速提交 Issue，无需跳转外部浏览器。"}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4, color: "var(--text)" }}>
                        {language === "en-US" ? "GitHub Personal Access Token (PAT):" : "GitHub Personal Access Token (PAT)："}
                      </div>
                      <Input.Password
                        placeholder={language === "en-US" ? "Enter your GitHub Token (e.g. ghp_...)" : "请输入您的 GitHub Token (例如 ghp_...)"}
                        value={contribToken}
                        onChange={(e) => setContribToken(e.target.value)}
                        style={{ height: 38 }}
                      />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Checkbox
                        checked={rememberToken}
                        onChange={(e) => setRememberToken(e.target.checked)}
                      >
                        <span style={{ fontSize: 12, color: "var(--text-2)" }}>
                          {language === "en-US"
                            ? "Remember Token (saved locally in localStorage only)"
                            : "记住 Token（仅保存在本机 localStorage，绝不泄露）"}
                        </span>
                      </Checkbox>
                      <a
                        style={{ fontSize: 12 }}
                        onClick={() =>
                          openExternalUrl(
                            "https://github.com/settings/tokens/new?scopes=public_repo&description=QingshanToolboxContrib"
                          )
                        }
                      >
                        <LinkOutlined /> {language === "en-US" ? "Generate Token on GitHub (needs public_repo only)" : "点此前往 GitHub 生成 Token (仅需勾选 public_repo)"}
                      </a>
                    </div>

                    {contribSuccessUrl && (
                      <Alert
                        type="success"
                        showIcon
                        message={language === "en-US" ? "🎉 Submitted! Issue created successfully" : "🎉 提交成功！Issue 已自动创建"}
                        description={
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
                            <span style={{ fontSize: 12, wordBreak: "break-all" }}>{contribSuccessUrl}</span>
                            <Button size="small" type="primary" onClick={() => openExternalUrl(contribSuccessUrl)}>
                              {language === "en-US" ? "View" : "立即查看"}
                            </Button>
                          </div>
                        }
                      />
                    )}

                    <Button
                      type="primary"
                      loading={contribLoading}
                      icon={<ThunderboltOutlined />}
                      onClick={handleDirectApiSubmit}
                      style={{ height: 40, marginTop: 4 }}
                    >
                      {language === "en-US"
                        ? `⚡ Direct Submit to GitHub Issue (${selectedContribIds.length} items)`
                        : `⚡ 立即一键直传提交至 GitHub Issue (${selectedContribIds.length} 条)`}
                    </Button>
                  </div>
                ),
              },
              {
                key: "browser",
                label: (
                  <span>
                    <GlobalOutlined style={{ marginRight: 4 }} />
                    {language === "en-US" ? "Channel 2: Export File & Open Issue (No Token)" : "通道二：导出文件并打开 Issue (免 Token)"}
                  </span>
                ),
                children: (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "4px 0" }}>
                    <div style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.6 }}>
                      {language === "en-US" ? (
                        <>
                          Suitable for general users or IT staff without a Token. Click the button below, the toolbox will{" "}
                          <strong>automatically export a <code>.json</code> data file, copy the formatted payload to clipboard, and open GitHub Issue in browser</strong>!
                        </>
                      ) : (
                        <>
                          适合没有配置 Token 的普通用户或运维人员。点击下方主按钮，工具箱将<strong>全自动为您导出 <code>.json</code> 数据文件、复制标准化数据包到剪贴板，并自动在浏览器中打开 GitHub Issue 页面</strong>！
                        </>
                      )}
                    </div>

                    <Button
                      type="primary"
                      style={{ height: 44, fontSize: 13.5, fontWeight: 600 }}
                      icon={<ThunderboltOutlined />}
                      onClick={handleExportAndOpenIssue}
                    >
                      {language === "en-US"
                        ? `🚀 Export Data File & Open GitHub Issue (${selectedContribIds.length} items)`
                        : `🚀 一键导出数据文件并打开 GitHub Issue (${selectedContribIds.length} 条)`}
                    </Button>

                    {browserIssueUrl && (
                      <Alert
                        type="info"
                        showIcon
                        message={language === "en-US" ? "GitHub Issue submission page triggered" : "GitHub Issue 提交页面已触发打开"}
                        description={
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                            <div style={{ fontSize: 12 }}>
                              {language === "en-US"
                                ? "If your browser did not open automatically, click the link or button below:"
                                : "若默认浏览器未自动弹出，可直接点击下方链接或按钮手动打开："}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <a
                                style={{ fontSize: 12, wordBreak: "break-all", fontWeight: 600 }}
                                onClick={() => openExternalUrl(browserIssueUrl)}
                              >
                                👉 {browserIssueUrl}
                              </a>
                              <Button
                                size="small"
                                type="primary"
                                onClick={() => openExternalUrl(browserIssueUrl)}
                              >
                                {language === "en-US" ? "Open Browser" : "打开网页"}
                              </Button>
                            </div>
                          </div>
                        }
                      />
                    )}

                    <div
                      style={{
                        padding: "10px 12px",
                        background: "var(--bg-soft)",
                        borderRadius: 6,
                        border: "1px dashed var(--border)",
                        fontSize: 12,
                        color: "var(--text-2)",
                        lineHeight: 1.6,
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--text)" }}>
                        {language === "en-US" ? "💡 How to submit on GitHub:" : "💡 在打开的 GitHub 网页中如何提交："}
                      </div>
                      <div>
                        • <strong>{language === "en-US" ? "Method 1 (Paste): " : "方式 1（粘贴快捷提交）："}</strong>
                        {language === "en-US" ? "Press " : "直接在 Issue 内容框中按 "}<code>Ctrl + V</code>
                        {language === "en-US" ? " in the Issue description area to paste the payload." : " 粘贴刚才复制好的内容。"}
                      </div>
                      <div>
                        • <strong>{language === "en-US" ? "Method 2 (Attachment): " : "方式 2（上传附件提交）："}</strong>
                        {language === "en-US" ? "Drag & drop the downloaded " : "直接将刚才下载导出的 "}<code>.json</code>
                        {language === "en-US" ? " file into the Issue box as an attachment." : " 文件拖入 Issue 框中作为附件。"}
                      </div>
                      <div>
                        • {language === "en-US" ? "Finally click the green " : "最后点击右下角绿色 "}
                        <strong>【Submit new issue】</strong>
                        {language === "en-US" ? " button!" : " 按钮即可！"}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10 }}>
                      <Button
                        style={{ flex: 1 }}
                        icon={<CopyOutlined />}
                        onClick={async () => {
                          const candidatePool = includeAllLocalForContrib
                            ? allItems
                            : customItems.length > 0
                            ? customItems
                            : allItems;
                          const itemsToSubmit = candidatePool.filter((i) =>
                            selectedContribIds.includes(i.id)
                          );
                          const jsonStr = JSON.stringify(itemsToSubmit, null, 2);
                          const isEn = language === "en-US";
                          const issueBody = isEn
                            ? `### Contributor Submitted Issue Records\n\n\`\`\`json\n${jsonStr}\n\`\`\`\n\n- **Client:** Qingshan Toolbox Desktop (v1.1.2)\n- **Count:** ${itemsToSubmit.length} items\n- **Submitted:** ${new Date().toLocaleString()}\n\nThank you for contributing to open-source IT support knowledge base!`
                            : `### 贡献者提交的新问题记录\n\n\`\`\`json\n${jsonStr}\n\`\`\`\n\n- **提交来源：** 青衫工具箱客户端 (v1.1.2)\n- **案例数量：** ${itemsToSubmit.length} 条\n- **提交时间：** ${new Date().toLocaleString()}\n\n感谢为开源桌面运维与IT支持资料库做出贡献！`;
                          await navigator.clipboard.writeText(issueBody);
                          message.success(
                            isEn
                              ? "Formatted data copied! Press Ctrl+V on GitHub Issue page!"
                              : "已复制标准化贡献数据包！可在 GitHub Issue 页面按 Ctrl+V 粘贴！"
                          );
                        }}
                      >
                        {language === "en-US" ? "📋 Copy Payload Only" : "📋 仅复制数据包"}
                      </Button>
                      <Button
                        style={{ flex: 1 }}
                        icon={<DownloadOutlined />}
                        onClick={handleExportSelectedContrib}
                      >
                        {language === "en-US" ? "📥 Export File (.json)" : "📥 仅导出数据文件 (.json)"}
                      </Button>
                      <Button
                        style={{ flex: 1 }}
                        icon={<GlobalOutlined />}
                        onClick={() => {
                          const isEn = language === "en-US";
                          const titleParam = encodeURIComponent(
                            isEn
                              ? `[Knowledge Contribution] Submit ${selectedContribIds.length} new issue cases`
                              : `[知识库贡献] 提交 ${selectedContribIds.length} 条新问题案例`
                          );
                          const shortUrl = `https://github.com/DragonTsunami/qingshan-toolbox/issues/new?title=${titleParam}`;
                          setBrowserIssueUrl(shortUrl);
                          void openExternalUrl(shortUrl);
                        }}
                      >
                        {language === "en-US" ? "🌐 Open Web Only" : "🌐 仅打开网页"}
                      </Button>
                    </div>
                  </div>
                ),
              },
              {
                key: "offline",
                label: (
                  <span>
                    <DownloadOutlined style={{ marginRight: 4 }} />
                    {language === "en-US" ? "Channel 3: Offline Export (Internal IT)" : "通道三：离线导出 (交付企业运维)"}
                  </span>
                ),
                children: (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "4px 0" }}>
                    <div style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.6 }}>
                      {language === "en-US" ? (
                        <>
                          Suitable for internal enterprise networks without direct GitHub access. Export selected records to a standard <code>.json</code> file to send directly to your IT team via internal chat, email, or ticketing.
                        </>
                      ) : (
                        <>
                          适合公司内网等无法直连外网 GitHub 的受限办公环境。将选中的问题记录导出为标准的 <code>.json</code> 文件，直接通过企业微信、邮件或工单发送给您公司的企业 IT 运维工程师审核。
                        </>
                      )}
                    </div>
                    <Button
                      type="default"
                      icon={<DownloadOutlined />}
                      onClick={handleExportSelectedContrib}
                      style={{ height: 40 }}
                    >
                      {language === "en-US" ? "📥 Export Selected Issues to File (.json)" : "📥 导出选中的案例为离线文件 (.json)"}
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </Modal>

      {/* 用户端问题大字版弹窗 */}
      <Modal
        title={
          detailItem ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Tag color={severityConfig[detailItem.severity].tagColor}>
                {severityConfig[detailItem.severity].label}
              </Tag>
              <span>{detailItem.title}</span>
            </div>
          ) : null
        }
        open={!!detailItem}
        onCancel={() => setDetailItem(null)}
        footer={[
          <Button
            key="fix"
            type="primary"
            icon={<ThunderboltOutlined />}
            loading={detailItem ? fixingId === detailItem.id : false}
            onClick={() => detailItem && handleTryFix(detailItem)}
          >
            {language === "en-US" ? "Try Fix" : "一键修复尝试"}
          </Button>,
          <Button
            key="copyFault"
            icon={<CopyOutlined />}
            onClick={() => detailItem && handleCopyFaultReport(detailItem)}
          >
            {language === "en-US" ? "Copy Report for IT" : "复制问题发给运维"}
          </Button>,
          <Button key="close" onClick={() => setDetailItem(null)}>
            {t("关闭")}
          </Button>,
        ]}
        width={620}
        zIndex={1050}
        destroyOnClose
      >
        {detailItem && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
                {language === "en-US" ? "💻 Observed Symptoms:" : "💻 您的电脑表现出的具体问题："}
              </div>
              <div className="kb-error-box" style={{ maxHeight: "none", WebkitLineClamp: "unset", fontSize: 13, padding: "10px 12px" }}>
                {detailItem.symptom}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
                {language === "en-US" ? "❓ Root Cause Summary:" : "❓ 为什么会出现这个情况："}
              </div>
              <div className="kb-reason-box" style={{ maxHeight: "none", WebkitLineClamp: "unset", fontSize: 13, padding: "10px 12px" }}>
                {detailItem.causeSummary}
              </div>
            </div>

            <div className="kb-support-banner" style={{ marginTop: 6 }}>
              <InfoCircleOutlined style={{ color: "#faad14", fontSize: 18, marginTop: 2 }} />
              <div>
                <strong>{language === "en-US" ? "Solution Guidance: " : "解决方式说明："}</strong>
                {language === "en-US"
                  ? "No technical expertise required. Click [Try Fix] below and the toolbox will automatically attempt to repair it in the background."
                  : "您无需懂代码或做复杂配置。直接点击下方【一键修复尝试】，工具箱将自动在后台尝试为您修复。"}
              </div>
            </div>

            <div
              style={{
                padding: "12px 14px",
                borderRadius: 8,
                background: "var(--bg-soft)",
                border: "1px solid var(--border)",
                fontSize: 12.5,
                lineHeight: 1.6,
                color: "var(--text-2)",
              }}
            >
              <div style={{ fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                {language === "en-US" ? "👨‍💻 If the issue persists after fix attempt:" : "👨‍💻 如果一键修复后仍无法解决："}
              </div>
              {detailItem.fallbackAdvice}
              <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 12 }}>
                {language === "en-US"
                  ? "Simply click [Copy Report for IT] below to send the issue summary to your enterprise IT support team for professional assistance."
                  : "您只需点击弹窗下方的【复制问题发给运维】，即可把当前问题情况发给公司的企业 IT 运维工程师，交由专业运维人员协助处理即可。"}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 修复尝试执行结果反馈弹窗 */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {fixResult?.success ? (
              <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 18 }} />
            ) : (
              <ExclamationCircleOutlined style={{ color: "#faad14", fontSize: 18 }} />
            )}
            <span>{fixResult?.title || (language === "en-US" ? "Fix Attempt Feedback" : "修复尝试反馈")}</span>
          </div>
        }
        open={!!fixResult}
        onCancel={() => setFixResult(null)}
        footer={[
          <Button
            key="help"
            type="primary"
            icon={<CustomerServiceOutlined />}
            onClick={openSupportModal}
          >
            {language === "en-US" ? "Contact IT Support Guide" : "联系运维工程师指引"}
          </Button>,
          <Button key="ok" onClick={() => setFixResult(null)}>
            {language === "en-US" ? "Got It" : "我知道了"}
          </Button>,
        ]}
        width={540}
        zIndex={1150}
        destroyOnClose
      >
        {fixResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, margin: "16px 0" }}>
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 8,
                background: "var(--bg-soft)",
                border: "1px solid var(--border)",
                fontSize: 13,
                lineHeight: 1.6,
                color: "var(--text)",
                whiteSpace: "pre-wrap",
              }}
            >
              {fixResult.detail}
            </div>

            <div className="kb-support-banner" style={{ marginTop: 0 }}>
              <WarningOutlined style={{ color: "#faad14", fontSize: 18, marginTop: 2 }} />
              <div>
                <strong style={{ display: "block", marginBottom: 2 }}>
                  {language === "en-US" ? "Next Steps:" : "后续指引："}
                </strong>
                {fixResult.contactSupportTip}
                <div style={{ marginTop: 4, color: "var(--muted)", fontSize: 12 }}>
                  {language === "en-US"
                    ? "If the issue persists after the fix attempt, please contact your organization's IT support team for assistance."
                    : "如果上述修复尝试完成后问题仍然存在，请直接联系您所在企业的 IT 运维工程师协助处理。"}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 企业 IT 桌面运维工程师求助指引独立弹窗 */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CustomerServiceOutlined style={{ color: "var(--accent)", fontSize: 18 }} />
            <span>{language === "en-US" ? "How to Contact Enterprise IT Support" : "如何联系企业 IT 运维工程师协助"}</span>
          </div>
        }
        open={showSupportModal}
        onCancel={() => setShowSupportModal(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setShowSupportModal(false)}>
            {language === "en-US" ? "Got It" : "我知道了"}
          </Button>,
        ]}
        width={520}
        zIndex={2000}
        destroyOnClose
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12, margin: "12px 0", fontSize: 13, lineHeight: 1.6 }}>
          <div style={{ padding: "12px 14px", background: "var(--bg-soft)", borderRadius: 8, border: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 600, marginBottom: 6, color: "var(--text)" }}>
              {language === "en-US" ? "📋 When encountering unresolved issues:" : "📋 遇到无法解决的问题时："}
            </div>
            <ol style={{ paddingLeft: 18, margin: 0, color: "var(--text-2)" }}>
              <li style={{ marginBottom: 4 }}>
                <strong>{language === "en-US" ? "Copy Issue: " : "复制问题："}</strong>
                {language === "en-US"
                  ? "Click [Copy] on the card to copy problem details to clipboard."
                  : "在卡片上点击【复制描述】，将问题信息复制到剪贴板。"}
              </li>
              <li style={{ marginBottom: 4 }}>
                <strong>{language === "en-US" ? "Submit Ticket: " : "提交报修："}</strong>
                {language === "en-US"
                  ? "Send via Enterprise WeChat, DingTalk, Feishu, Slack, or company ticketing system to your IT team."
                  : "直接通过企业微信、钉钉、飞书发送给公司的 IT 运维老师或录入工单。"}
              </li>
              <li>
                <strong>{language === "en-US" ? "Leave it to Pros: " : "交由专业人员："}</strong>
                {language === "en-US"
                  ? "Subsequent reinstallation, driver fixing, or hardware replacement will be handled professionally by engineers."
                  : "后续如何重装、修驱动或换硬件由运维工程师专业处理，您无需自行操作。"}
              </li>
            </ol>
          </div>
        </div>
      </Modal>
    </div>
  );
}
