import React, { useMemo, useState } from "react";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CustomerServiceOutlined,
  ExclamationCircleOutlined,
  FireOutlined,
  GlobalOutlined,
  HddOutlined,
  InfoCircleOutlined,
  MailOutlined,
  PrinterOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  WarningOutlined,
  WindowsOutlined,
  CopyOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import { Button, Empty, Input, Modal, Tag, Tooltip, message } from "antd";
import { tryKnowledgeFix } from "../api";
import type { KnowledgeFixResult } from "../types";
import "../knowledge.css";

export type SeverityLevel = "danger" | "urgent" | "warning" | "common";

interface TroubleshootingItem {
  id: string;
  category: "system" | "network" | "hardware" | "printer" | "office";
  severity: SeverityLevel;
  title: string;
  errorCode?: string;
  symptom: string;
  causeSummary: string;
  fixActionName: string;
  fallbackAdvice: string;
}

const KNOWLEDGE_BASE: TroubleshootingItem[] = [
  // ================= 🔴 危险级 (Danger) =================
  {
    id: "dt-bsod-dump",
    category: "system",
    severity: "danger",
    title: "Windows 蓝屏崩溃并频繁自动重启",
    errorCode: "0x50 / CRITICAL_PROCESS_DIED",
    symptom: "使用电脑时屏幕突然变蓝死机并自动重启，开机不久后又重复出现蓝屏，无法正常办公。",
    causeSummary: "通常由近期安装的系统更新补丁冲突、显卡/声卡驱动损坏，或电脑内部内存条硬件接触不良引发。",
    fixActionName: "检查系统核心状态并尝试基础自愈",
    fallbackAdvice: "若尝试后仍旧频繁蓝屏，通常属于硬件氧化松动或内核冲突，请直接联系您公司的企业 IT 运维工程师检修硬件。",
  },
  {
    id: "dt-boot-bcd",
    category: "system",
    severity: "danger",
    title: "开机黑屏提示找不到操作系统 (BCD损坏)",
    errorCode: "0x7B / An OS wasn't found",
    symptom: "电脑按电源开机后屏幕黑屏，提示“An operating system wasn't found”或“Recovery”，无法进入桌面。",
    causeSummary: "电脑启动引导数据损坏，或主板设置中的启动模式发生异常更改导致系统盘无法加载。",
    fixActionName: "读取并检测当前开机引导结构",
    fallbackAdvice: "开机引导丢失需要使用专用维护 U 盘重构系统引导文件，请直接联系企业 IT 运维工程师现场协助恢复。",
  },
  {
    id: "dt-malware-miner",
    category: "system",
    severity: "danger",
    title: "电脑异常卡顿发热疑似被植入挖矿病毒",
    errorCode: "CPU 100% 满载 / 异常外联",
    symptom: "电脑风扇狂转、机身发烫极度卡顿，打开任务管理器时占用瞬间降下来，疑似被植入木马后门。",
    causeSummary: "可能由于误下载运行了带毒的破解补丁，或远程桌面弱密码被外网恶意扫描暴力破解植入挖矿木马。",
    fixActionName: "应急排查后台活动网络连接与高占用进程",
    fallbackAdvice: "【极度危险】请第一时间拔掉网线或断开 Wi-Fi 物理断网隔离，立即联系企业安全与 IT 运维工程师进行深度杀毒应急处理！",
  },
  {
    id: "dt-disk-smart-io",
    category: "hardware",
    severity: "danger",
    title: "硬盘读取报错或变为只读不能保存文件",
    errorCode: "0x8007045D / 磁盘 I-O 错误",
    symptom: "复制或保存文件时弹出 I/O 错误无法操作，或者固态硬盘掉盘变为只读，无法保存任何新文件。",
    causeSummary: "机械硬盘出现物理坏道，或者固态硬盘芯片触发了只读安全锁定机制。",
    fixActionName: "执行磁盘介质硬件健康体检自检",
    fallbackAdvice: "【重要提示】切勿反复强行拷大文件！请立即联系企业 IT 运维工程师协助对重要工作资料进行离线备份并更换硬盘。",
  },

  // ================= 🟠 紧急级 (Urgent) =================
  {
    id: "dt-net-ip-conflict",
    category: "network",
    severity: "urgent",
    title: "网络连接提示 IP 冲突导致上不了网",
    errorCode: "IP 冲突 / 黄色感叹号",
    symptom: "屏幕右下角网络图标弹出黄色感叹号，提示“检测到 IP 地址冲突”，无法打开任何网页。",
    causeSummary: "办公室局域网内存在私接的家用路由器等未授权设备，抢占并下发了错误的 IP 地址池。",
    fixActionName: "主动释放并重新向公司申请合法 IP",
    fallbackAdvice: "若重新获取后依然频繁冲突断网，说明局域网内存在非法设备泛洪，请联系网络管理员排查交换机端口。",
  },
  {
    id: "dt-ad-trust-failed",
    category: "system",
    severity: "urgent",
    title: "开机登录提示与主域信任关系失败",
    errorCode: "域信任失败 / 无法登入桌面",
    symptom: "输入平时的工作账号密码时，提示“此工作站与主域之间的信任关系失败”，无法登入电脑桌面。",
    causeSummary: "电脑长期离线未开机（超过密码轮转周期），导致电脑安全账号与企业域控制器的加密通道脱节。",
    fixActionName: "检测企业域安全信任通道连通状态",
    fallbackAdvice: "域信任关系中断需要域管理员权限重新绑定安全通道，请联系企业 IT 运维工程师提供支持。",
  },
  {
    id: "dt-office-outlook-pst",
    category: "office",
    severity: "urgent",
    title: "Outlook 邮箱客户端启动卡死打不开",
    errorCode: "正在加载配置文件 / OST 损坏",
    symptom: "启动 Outlook 一直卡在“正在加载配置文件”转圈几十秒闪退，或提示“无法打开 Outlook 窗口”。",
    causeSummary: "本地邮件数据文件（OST）过大损坏，或第三方插件卡死导致 Outlook 主线程假死挂起。",
    fixActionName: "结束卡死进程并尝试以安全模式唤起",
    fallbackAdvice: "若安全模式下依然无法加载，说明邮件数据文件破损，请联系企业 IT 运维工程师协助修复或重新同步云端邮箱。",
  },
  {
    id: "dt-rdp-credssp",
    category: "network",
    severity: "urgent",
    title: "远程桌面连不上报 CredSSP 凭据加密错误",
    errorCode: "CredSSP Encryption Oracle 修正",
    symptom: "使用 Windows 远程桌面连接服务器或同事电脑时，弹窗拦截提示“要求的函数不受支持 / CredSSP 修正”。",
    causeSummary: "本机安装了最新安全补丁，而目标远程机器为未打补丁的老系统，两端安全策略等级不匹配被系统拦截。",
    fixActionName: "应用远程桌面宽松兼容策略",
    fallbackAdvice: "若应用后仍无法连接，请联系目标服务器的运维人员检查远程桌面服务与防火墙端口状态。",
  },

  // ================= 🟡 重点级 (Warning) =================
  {
    id: "dt-printer-11b-709",
    category: "printer",
    severity: "warning",
    title: "连接共享打印机报错 0x0000011b 或 709",
    errorCode: "0x0000011b / 0x00000709",
    symptom: "添加或连接办公室内同事电脑共享的打印机时，弹窗报错 0x0000011b 或 0x00000709，无法打印。",
    causeSummary: "微软系统安全补丁强化了 RPC 身份验证限制，导致无域控局域网环境下的匿名打印共享被系统拦截。",
    fixActionName: "放行局域网打印共享兼容策略并重启服务",
    fallbackAdvice: "若依然提示 0x11b，通常需要连接打印机的主机电脑也同样执行一次修复，或联系企业 IT 运维配置直连端口。",
  },
  {
    id: "dt-printer-spooler-crash",
    category: "printer",
    severity: "warning",
    title: "打印后台服务频繁崩溃 / 所有打印机消失",
    errorCode: "Print Spooler 停止运行",
    symptom: "“设备和打印机”页面空白，原本的打印机全都不见，点击打印提示“打印后台处理程序未运行”。",
    causeSummary: "打印队列中存在破损卡住的旧文档碎片文件，导致 Windows 打印服务一启动加载就崩溃闪退。",
    fixActionName: "清空损坏假脱机缓存队列并重启服务",
    fallbackAdvice: "若清理后依然频繁崩溃，多由某个损坏的旧打印机驱动引发，请联系企业 IT 运维工程师协助清理驱动程序。",
  },
  {
    id: "dt-sys-update-loop",
    category: "system",
    severity: "warning",
    title: "系统更新卡在 100% 撤销更改死循环",
    errorCode: "正在撤销更改 / 请勿关闭计算机",
    symptom: "开机一直卡在“正在配置更新 100% 完成，正在撤消更改，请勿关闭计算机”，反复重启很长时间。",
    causeSummary: "Windows 自动下载的系统补丁缓存文件发生损坏或缺失，导致每次安装到最后一步失败撤回。",
    fixActionName: "重置 Windows Update 缓存目录并刷新服务",
    fallbackAdvice: "若开机更新依然陷入撤回循环，说明底层组件仓库损坏，请联系企业 IT 运维工程师协助离线修复。",
  },
  {
    id: "dt-office-kms-activate",
    category: "office",
    severity: "warning",
    title: "Office 或 Windows 激活失效 (0xC004F074)",
    errorCode: "0xC004F074 / 产品未经授权",
    symptom: "屏幕右下角突然出现“激活 Windows”水印，Word 标题栏提示“产品未经授权”无法编辑文档。",
    causeSummary: "电脑系统时间与公司激活服务器偏差过大，或者长期出差未连入企业内网导致未能完成定期授权验证。",
    fixActionName: "校准网络时钟并向企业激活服务器申请认证",
    fallbackAdvice: "若依然提示服务器不可用，请确保电脑已接入公司局域网或 VPN，并联系企业 IT 运维确认 KMS 授权状态。",
  },

  // ================= 🟢 常见级 (Common) =================
  {
    id: "dt-net-winsock-reset",
    category: "network",
    severity: "common",
    title: "微信能登但浏览器任何网页打不开",
    errorCode: "DNS_PROBE_FINISHED_NO_INTERNET",
    symptom: "微信、QQ 正常聊天收发图片，但是 Edge、Chrome 浏览器任何网页都打不开，提示网络未连接。",
    causeSummary: "Windows 本地网络通信目录（Winsock）或 DNS 域名解析缓存被代理软件或异常插件篡改阻塞。",
    fixActionName: "重置 Winsock 协议栈并刷新 DNS 缓存",
    fallbackAdvice: "若修复后重启电脑依然打不开网页，说明可能存在未清理的无效系统代理，请联系企业 IT 运维协助排查。",
  },
  {
    id: "dt-sys-explorer-hang",
    category: "system",
    severity: "common",
    title: "桌面图标变白 / 任务栏卡死一直转圈",
    errorCode: "Explorer.exe 假死挂起",
    symptom: "桌面所有图标突然变白或消失，点击任务栏或开始菜单毫无反应一直在转圈，右键文件卡顿几十秒。",
    causeSummary: "Windows 桌面与任务栏主进程（Explorer）被某些流氓软件的右键菜单扩展插件卡死挂起。",
    fixActionName: "强制重启假死的 Windows 资源管理器进程",
    fallbackAdvice: "若频繁出现卡死，通常由第三方右键菜单扩展死锁导致，请联系企业 IT 运维工程师协助清理右键扩展项。",
  },
  {
    id: "dt-usb-gpo-block",
    category: "hardware",
    severity: "common",
    title: "插入 U 盘提示“访问被拒绝”或介质写保护",
    errorCode: "访问被拒绝 / 介质受写入保护",
    symptom: "外接移动硬盘或 U 盘插上能看到盘符，但双击提示访问被拒绝，或者无法往里面写入保存任何文件。",
    causeSummary: "电脑本地注册表启用了写保护，或者所在公司的域控开启了移动存储防泄密管控策略。",
    fixActionName: "尝试重置本地注册表写保护标记",
    fallbackAdvice: "若重新插拔后依然无法写入，属于公司统一的数据防泄密安全合规策略，请联系企业 IT 管理员申请外发权限。",
  },
  {
    id: "dt-user-temp-profile",
    category: "system",
    severity: "common",
    title: "开机提示“您已使用临时配置文件登录”",
    errorCode: "您已使用临时配置文件登录",
    symptom: "开机登入桌面后右下角弹出气泡提示临时配置，原本保存在桌面上的文档和个性化壁纸全都不见了。",
    causeSummary: "前一次非正常关机导致个人账户注册表文件被锁住，系统无法正常读取，降级分配了一个空桌面。",
    fixActionName: "扫描账户配置文件注册表状态",
    fallbackAdvice: "【注意：切勿在临时桌面中保存重要文件！】请立即联系企业 IT 运维工程师帮您恢复原账户文件映射。",
  },
  {
    id: "dt-printer-offline",
    category: "printer",
    severity: "common",
    title: "网络打印机始终显示“脱机”无法使用",
    errorCode: "打印机状态脱机 (Offline)",
    symptom: "办公室网络打印机电源开着、网线也插着，但在电脑中打印机始终显示为灰色的“脱机”状态，无法打印。",
    causeSummary: "电脑本地网络地址缓存过期，或跨办公网段时打印驱动的探活状态误判为脱机。",
    fixActionName: "刷新网络地址缓存并重启本地打印连接",
    fallbackAdvice: "若打印机仍旧显示脱机，请联系企业 IT 运维工程师检查该打印机的网络 IP 地址是否被改动。",
  },
];

// 级别定义：危险级、紧急级、重点级、常见级
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
  { key: "hardware", label: "硬盘与U盘", icon: <HddOutlined /> },
  { key: "printer", label: "办公室打印机", icon: <PrinterOutlined /> },
  { key: "office", label: "办公与邮件", icon: <MailOutlined /> },
] as const;

export default function KnowledgePage() {
  const [keyword, setKeyword] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [fixingId, setFixingId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<TroubleshootingItem | null>(null);
  const [fixResult, setFixResult] = useState<KnowledgeFixResult | null>(null);
  const [showSupportModal, setShowSupportModal] = useState(false);

  const filteredItems = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return KNOWLEDGE_BASE.filter((item) => {
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
  }, [keyword, selectedSeverity, selectedCategory]);

  // 打开求助弹窗（绝对互斥关闭其他弹窗）
  const openSupportModal = () => {
    setDetailItem(null);
    setFixResult(null);
    setShowSupportModal(true);
  };

  // 打开卡片大字详情（绝对互斥关闭求助弹窗）
  const openDetailModal = (item: TroubleshootingItem, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setShowSupportModal(false);
    setDetailItem(item);
  };

  // 一键尝试修复核心方法（纯粹用户端，无需用户手动配置）
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
        title: item.title + " - 修复尝试异常",
        detail: `系统调用异常: ${String(err)}。可能因当前用户权限不足或策略限制。`,
        contactSupportTip: item.fallbackAdvice,
      });
    } finally {
      setFixingId(null);
    }
  };

  // 一键复制故障信息供发给运维老师
  const handleCopyFaultReport = (item: TroubleshootingItem) => {
    const text = [
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
    message.success("已复制问题说明，可直接微信/钉钉/飞书发给企业运维工程师");
  };

  return (
    <div className="kb-container">
      {/* 顶部置顶搜索与过滤面板 */}
      <section className="kb-header-card">
        <div className="kb-search-row">
          <Input
            className="kb-search-input"
            prefix={<SearchOutlined style={{ color: "var(--muted)", marginRight: 6 }} />}
            placeholder="搜索您遇到的电脑问题、报错代码 (如 0x11b, 蓝屏, 微信能上网页打不开, 打印机脱机, 临时配置)..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            allowClear
            size="large"
          />
          <Button
            type="default"
            icon={<CustomerServiceOutlined />}
            onClick={openSupportModal}
            style={{ borderRadius: 8, height: 40 }}
          >
            联系运维工程师指引
          </Button>
        </div>

        <div className="kb-filters-container">
          {/* 第一组：级别过滤 */}
          <div className="kb-filter-row">
            <div className="kb-filter-group">
              <span className="kb-filter-label">问题级别:</span>
              <span
                className={`kb-pill${selectedSeverity === "all" ? " active" : ""}`}
                onClick={() => setSelectedSeverity("all")}
              >
                全部 ({KNOWLEDGE_BASE.length})
              </span>
              {(["danger", "urgent", "warning", "common"] as SeverityLevel[]).map((sev) => {
                const conf = SEVERITY_CONFIG[sev];
                const count = KNOWLEDGE_BASE.filter((i) => i.severity === sev).length;
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
              找到 <strong>{filteredItems.length}</strong> / {KNOWLEDGE_BASE.length} 个常见问题指南
            </div>
          </div>

          {/* 第二组：分类过滤 */}
          <div className="kb-filter-row">
            <div className="kb-filter-group">
              <span className="kb-filter-label">场景分类:</span>
              {CATEGORIES.map((cat) => (
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
                未找到包含 "<strong>{keyword}</strong>" 的问题说明，您可以尝试输入 蓝屏、打印机、或错误代码
              </span>
            }
          />
        </div>
      ) : (
        <div className="kb-grid">
          {filteredItems.map((item) => {
            const conf = SEVERITY_CONFIG[item.severity];
            const isFixing = fixingId === item.id;
            return (
              <article
                key={item.id}
                className="kb-card"
                onClick={(e) => openDetailModal(item, e)}
              >
                <div className="kb-card-top">
                  {/* 头部：级别 Badge + 错误代码 Tag */}
                  <div className="kb-card-head">
                    <Tag color={conf.tagColor} style={{ marginRight: 0, fontWeight: 500 }}>
                      {conf.icon} {conf.label}
                    </Tag>
                    {item.errorCode && (
                      <Tag
                        bordered={false}
                        color="default"
                        style={{ fontFamily: "var(--font-code)", fontSize: 11, maxWidth: 160 }}
                      >
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", display: "inline-block" }}>
                          {item.errorCode}
                        </span>
                      </Tag>
                    )}
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
                      {isFixing ? "正在尝试修复..." : "一键修复尝试"}
                    </Button>
                    <Button
                      type="default"
                      icon={<CopyOutlined />}
                      title="复制问题描述发给运维"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleCopyFaultReport(item);
                      }}
                    >
                      复制描述
                    </Button>
                  </div>

                  <div className="kb-footer-tips">
                    <span>💡 点击卡片可查看大字版问题说明</span>
                    <span style={{ color: "var(--accent)" }}>查看说明 ➔</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* 用户端问题大字版弹窗（极简纯粹，完全没有运维专业排查步骤，绝不重叠） */}
      <Modal
        title={
          detailItem ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Tag color={SEVERITY_CONFIG[detailItem.severity].tagColor}>
                {SEVERITY_CONFIG[detailItem.severity].label}
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
            一键修复尝试
          </Button>,
          <Button
            key="copyFault"
            icon={<CopyOutlined />}
            onClick={() => detailItem && handleCopyFaultReport(detailItem)}
          >
            复制问题发给运维
          </Button>,
          <Button key="close" onClick={() => setDetailItem(null)}>
            关闭
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
                💻 您的电脑表现出的具体问题：
              </div>
              <div className="kb-error-box" style={{ maxHeight: "none", WebkitLineClamp: "unset", fontSize: 13, padding: "10px 12px" }}>
                {detailItem.symptom}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
                ❓ 为什么会出现这个情况：
              </div>
              <div className="kb-reason-box" style={{ maxHeight: "none", WebkitLineClamp: "unset", fontSize: 13, padding: "10px 12px" }}>
                {detailItem.causeSummary}
              </div>
            </div>

            <div className="kb-support-banner" style={{ marginTop: 6 }}>
              <InfoCircleOutlined style={{ color: "#faad14", fontSize: 18, marginTop: 2 }} />
              <div>
                <strong>解决方式说明：</strong>
                您无需懂代码或做复杂配置。直接点击下方【一键修复尝试】，工具箱将自动在后台尝试为您修复。
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
                👨‍💻 如果一键修复后仍无法解决：
              </div>
              {detailItem.fallbackAdvice}
              <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 12 }}>
                您只需点击弹窗下方的【复制问题发给运维】，即可把当前问题情况发给公司的企业 IT 运维工程师，交由专业运维人员协助处理即可。
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
            <span>{fixResult?.title || "修复尝试反馈"}</span>
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
            联系运维工程师指引
          </Button>,
          <Button key="ok" onClick={() => setFixResult(null)}>
            我知道了
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
                <strong style={{ display: "block", marginBottom: 2 }}>后续指引：</strong>
                {fixResult.contactSupportTip}
                <div style={{ marginTop: 4, color: "var(--muted)", fontSize: 12 }}>
                  如果上述修复尝试完成后问题仍然存在，请直接联系您所在企业的 IT 运维工程师协助处理。
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 企业 IT 桌面运维工程师求助指引独立弹窗 (最高层级 zIndex=2000，绝对置顶且互斥) */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CustomerServiceOutlined style={{ color: "var(--accent)", fontSize: 18 }} />
            <span>如何联系企业 IT 运维工程师协助</span>
          </div>
        }
        open={showSupportModal}
        onCancel={() => setShowSupportModal(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setShowSupportModal(false)}>
            我知道了
          </Button>,
        ]}
        width={520}
        zIndex={2000}
        destroyOnClose
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12, margin: "12px 0", fontSize: 13, lineHeight: 1.6 }}>
          <div style={{ padding: "12px 14px", background: "var(--bg-soft)", borderRadius: 8, border: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 600, marginBottom: 6, color: "var(--text)" }}>
              📋 遇到无法解决的问题时：
            </div>
            <ol style={{ paddingLeft: 18, margin: 0, color: "var(--text-2)" }}>
              <li style={{ marginBottom: 4 }}>
                <strong>复制问题：</strong>在卡片上点击【复制描述】，将问题信息复制到剪贴板。
              </li>
              <li style={{ marginBottom: 4 }}>
                <strong>提交报修：</strong>直接通过企业微信、钉钉、飞书发送给公司的 IT 运维老师或录入工单。
              </li>
              <li>
                <strong>交由专业人员：</strong>后续如何重装、修驱动或换硬件由运维工程师专业处理，您无需自行操作。
              </li>
            </ol>
          </div>
        </div>
      </Modal>
    </div>
  );
}
