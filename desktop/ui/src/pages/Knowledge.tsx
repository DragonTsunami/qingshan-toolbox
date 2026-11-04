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
} from "@ant-design/icons";
import {
  Button,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Tag,
  Tooltip,
  message,
} from "antd";
import { fetchRemoteKnowledge, tryKnowledgeFix, openExternalUrl } from "../api";
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

// 国内外真实企业 IT 运维与终端用户咨询高频内置基础库 (25项精选)
const BUILTIN_KNOWLEDGE_BASE: TroubleshootingItem[] = [
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
  {
    id: "dt-screen-projection",
    category: "hardware",
    severity: "urgent",
    title: "会议室投屏或外接第二块显示器黑屏无信号",
    errorCode: "检测不到显示器 / No Signal",
    symptom: "笔记本连接会议室投影仪或工位外接显示屏时，外屏黑屏提示“无信号”，按 Win+P 切换无反应。",
    causeSummary: "显卡驱动的图形渲染输出通道休眠冻结，未能主动触发握手握频协商协议。",
    fixActionName: "强制重置多屏扩展与显示器投屏信号",
    fallbackAdvice: "若仍无信号输出，请检查 HDMI/Type-C 转接拓展坞是否供电不足或松动，或联系会议室运维更换线缆。",
  },
  {
    id: "dt-camera-privacy",
    category: "office",
    severity: "urgent",
    title: "腾讯会议/Teams/Zoom 摄像头黑屏有声音无画面",
    errorCode: "Webcam Black Screen / 访问被拒绝",
    symptom: "加入公司视频会议时，别人能听到自己的声音，但摄像头画面完全黑屏，提示“未能找到或打开摄像头”。",
    causeSummary: "Windows 系统隐私设置中误将“允许桌面应用访问相机”全局总开关关闭，会议软件被内核直接拦截。",
    fixActionName: "一键重置系统全局摄像头应用程序访问权限",
    fallbackAdvice: "若权限已打开画面依然全黑，请检查笔记本电脑镜头顶部的物理防窥遮挡滑盖是否关闭，或联系运维检修硬件。",
  },
  {
    id: "dt-disk-cleanup-c",
    category: "hardware",
    severity: "urgent",
    title: "C 盘爆满变红剩余几兆导致整机极度卡死",
    errorCode: "C 盘空间极度不足",
    symptom: "此电脑中系统 C 盘进度条变成刺眼的红色，可用空间仅剩几兆，打开任何软件都提示内存或空间不足卡死。",
    causeSummary: "Windows Update 下载的历史临时补丁未释放，加上各类软件长期运行堆积了数十 G 的无用临时日志。",
    fixActionName: "快速清空系统临时垃圾与废弃回收站文件",
    fallbackAdvice: "若清理后依然爆红，主要是由于微信电脑版长期接收的文件或个人文档占满，请联系运维协助迁移聊天文件至 D 盘。",
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
  {
    id: "dt-audio-realtek",
    category: "hardware",
    severity: "common",
    title: "耳机插上没有声音 / 提示未插入音频设备",
    errorCode: "Windows Audio 无法输出",
    symptom: "插上有线耳机或外接小音箱后电脑没有声音，右下角喇叭图标出现红色红叉或感叹号。",
    causeSummary: "Windows 系统的底层音频核心服务（Audiosrv）意外挂起，未能响应新插入音频设备的插拔事件。",
    fixActionName: "重启 Windows 音频端点与核心输出服务",
    fallbackAdvice: "若耳机依然无声音，多为音频插孔接触氧化松动或需要声卡硬件驱动修复，请联系企业 IT 运维人员协助。",
  },
  {
    id: "dt-ime-ctfmon",
    category: "system",
    severity: "common",
    title: "打字只能输入英文字母 / 切不出中文输入法",
    errorCode: "语言栏消失 / ctfmon 挂起",
    symptom: "按 Shift 或 Ctrl+Space 无法切换中文，打出来的全都是英文字母，任务栏右下角的拼音中英图标消失。",
    causeSummary: "Windows 语言指示器主控进程（ctfmon.exe）意外崩溃或未能随开机自启加载。",
    fixActionName: "重新拉起 Windows 输入法语言栏主控进程",
    fallbackAdvice: "若重启进程后依然切不出中文，多由输入法第三方插件冲突引起，请联系企业 IT 运维重置键盘首选语言。",
  },
  {
    id: "dt-clipboard-hang",
    category: "system",
    severity: "common",
    title: "复制粘贴突然失灵 / Ctrl+C 和 V 毫无反应",
    errorCode: "剪贴板通道锁死",
    symptom: "选中文字或文件按下 Ctrl+C 复制后，在其他软件中按下 Ctrl+V 粘贴不出任何内容，右键粘贴也是灰色。",
    causeSummary: "某款后台流氓软件异常锁死独占了系统剪贴板通道（Clipboard Viewer Lock），其他软件无法读取写入。",
    fixActionName: "强制释放被锁死的全局剪贴板句柄通道",
    fallbackAdvice: "若仍无法复制粘贴，请联系企业 IT 运维工程师协助排查并关闭非法占用剪贴板的后台流氓插件。",
  },
  {
    id: "dt-bt-peripheral",
    category: "hardware",
    severity: "common",
    title: "蓝牙鼠标键盘频繁跳帧断连或已配对无法连",
    errorCode: "Bluetooth Device Connect Error",
    symptom: "无线蓝牙鼠标指针断断续续跳帧漂移，或者在系统设置中显示“已配对”，但敲键盘动鼠标没有任何反应。",
    causeSummary: "Windows 蓝牙支持服务协议栈与休眠策略冲突，导致低功耗蓝牙外设掉线重连失败。",
    fixActionName: "重启蓝牙系统服务并重置无线通信协议栈",
    fallbackAdvice: "若仍无法连接，通常由于外设电池电量不足或工位附近 2.4G Wi-Fi 信号严重干扰，请更换电池或联系运维。",
  },
  {
    id: "dt-wifi-power-sleep",
    category: "network",
    severity: "common",
    title: "工位 Wi-Fi 隔几分钟就自动断网一次",
    errorCode: "无线网络间歇性断流",
    symptom: "连着公司的办公无线网，正常工作着突然断开断网，手动点击重新连接又能用，过几分钟又再次掉线。",
    causeSummary: "Windows 无线网卡默认勾选了“允许计算机关闭此设备以节约电源”，网卡芯片被系统强制降频休眠断电。",
    fixActionName: "一键禁用无线网卡自动节能休眠省电机制",
    fallbackAdvice: "若禁用省电后仍频繁掉线，说明工位所在区域 AP 信号覆盖弱或信道干扰严重，请联系网络工程师优化无线配置。",
  },
];

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
  const [keyword, setKeyword] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
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

  const [addForm] = Form.useForm();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 本地持久化加载
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setCustomItems(parsed);
        }
      }
    } catch {
      // 容错读取
    }
  }, []);

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
        title: item.title + " - 修复尝试异常",
        detail: `系统调用异常: ${String(err)}。可能因当前用户权限不足或策略限制。`,
        contactSupportTip: item.fallbackAdvice,
      });
    } finally {
      setFixingId(null);
    }
  };

  // 复制问题描述发给运维
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
        fixActionName: values.fixActionName?.trim() || "常规基础排障尝试",
        fallbackAdvice:
          values.fallbackAdvice?.trim() ||
          "若修复后仍有问题，请直接联系企业 IT 桌面运维工程师处理。",
        isCustom: true,
      };

      const updated = [newItem, ...customItems];
      saveCustomItems(updated);
      message.success(`成功添加问题记录: 「${newItem.title}」`);
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
    message.info("已删除该条自定义记录");
  };

  // 2. 导出资料库为 JSON 文件
  const handleExportKnowledge = () => {
    try {
      const exportPayload = {
        version: "1.0.6",
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
      link.download = `qingshan-knowledge-v1.0.6-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      message.success(`已成功导出 ${allItems.length} 条资料库内容为 JSON 文件！`);
    } catch (err) {
      message.error(`导出失败: ${String(err)}`);
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
          message.error("导入失败：文件内容不是合法的资料库格式");
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
          message.success(`成功导入并合并 ${addedCount} 项全新故障记录！`);
        } else {
          message.info("导入的文件中条目已存在于本地资料库中，未发生变更。");
        }
      } catch (err) {
        message.error(`解析 JSON 失败: ${String(err)}`);
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
      // 双源自动回退：优先高速镜像，兜底官方 Raw
      const sources = [
        "https://fastly.jsdelivr.net/gh/DragonTsunami/qingshan-toolbox@main/data/knowledge-community.json",
        "https://raw.githubusercontent.com/DragonTsunami/qingshan-toolbox/main/data/knowledge-community.json",
      ];

      let rawContent = "";
      let errorMsg = "";

      for (const url of sources) {
        try {
          rawContent = await fetchRemoteKnowledge(url);
          if (rawContent && rawContent.startsWith("{")) break;
        } catch (e) {
          errorMsg = String(e);
        }
      }

      if (!rawContent) {
        throw new Error(errorMsg || "无法连通 GitHub 远程知识库，请检查网络");
      }

      const json = JSON.parse(rawContent);
      if (json && Array.isArray(json.items)) {
        setRemoteData({
          version: json.version || "1.0.6",
          updatedAt: json.updatedAt || "近期",
          items: json.items,
        });
        message.success(`成功检测到 GitHub 云端资料库 (共 ${json.items.length} 条)！`);
      } else {
        throw new Error("云端数据结构不符合规范");
      }
    } catch (err) {
      message.error(`检查云端更新失败: ${String(err)}`);
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
      message.success(`已拉取并成功合并 ${newCount} 条云端最新故障指南！`);
    } else {
      message.info("您的本地资料库已是最新版本，无需额外合并。");
    }
    setShowSyncModal(false);
    setRemoteData(null);
  };

  // 4. 用户把本地新增的问题上传贡献至 GitHub
  const handleUploadContributionToGitHub = () => {
    const onlyCustom = customItems.filter((i) => i.isCustom);
    if (onlyCustom.length === 0) {
      message.warning("您本地暂未添加自定义问题记录。若要贡献，请先点击【➕ 新增问题记录】。");
      return;
    }

    const jsonStr = JSON.stringify(onlyCustom, null, 2);
    const issueTitle = encodeURIComponent(`[Knowledge-Contrib] 用户贡献了 ${onlyCustom.length} 条新问题`);
    const issueBody = encodeURIComponent(
      `### 贡献者提交的新问题记录\n\n\`\`\`json\n${jsonStr}\n\`\`\`\n\n**环境信息：** 青衫工具箱 v1.0.6\n感谢为社区运维资料库做出贡献！`
    );
    const githubIssueUrl = `https://github.com/DragonTsunami/qingshan-toolbox/issues/new?title=${issueTitle}&body=${issueBody}`;

    // 复制并打开浏览器
    void navigator.clipboard.writeText(jsonStr);
    message.success("已复制待提交数据，正在为您打开 GitHub Issue 页面...");
    void openExternalUrl(githubIssueUrl);
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
              新增记录
            </Button>

            <Tooltip title="将当前资料库导出备份为 JSON 文件">
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExportKnowledge}
                style={{ borderRadius: 8, height: 40 }}
              >
                导出
              </Button>
            </Tooltip>

            <Tooltip title="从外部导入 JSON 格式资料库内容并合并">
              <Button
                icon={<UploadOutlined />}
                onClick={() => fileInputRef.current?.click()}
                style={{ borderRadius: 8, height: 40 }}
              >
                导入
              </Button>
            </Tooltip>

            <Tooltip title="通过 GitHub 拉取最新资料或上传您的贡献">
              <Button
                icon={<CloudSyncOutlined />}
                onClick={() => setShowSyncModal(true)}
                style={{ borderRadius: 8, height: 40 }}
              >
                GitHub云端同步
              </Button>
            </Tooltip>

            <Button
              type="default"
              icon={<CustomerServiceOutlined />}
              onClick={openSupportModal}
              style={{ borderRadius: 8, height: 40 }}
            >
              联系运维
            </Button>
          </div>
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
                全部 ({allItems.length})
              </span>
              {(["danger", "urgent", "warning", "common"] as SeverityLevel[]).map((sev) => {
                const conf = SEVERITY_CONFIG[sev];
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
              找到 <strong>{filteredItems.length}</strong> / {allItems.length} 个常见问题指南
              {customItems.length > 0 && (
                <span style={{ marginLeft: 8, color: "#9254de" }}>
                  (包含 {customItems.length} 条自定义/导入记录)
                </span>
              )}
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
                未找到包含 "<strong>{keyword}</strong>" 的问题说明，您可以尝试输入 蓝屏、打印机、或点击右上角【➕ 新增记录】添加
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
                  {/* 头部：级别 Badge + 自定义 Tag + 错误代码 Tag */}
                  <div className="kb-card-head">
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Tag color={conf.tagColor} style={{ marginRight: 0, fontWeight: 500 }}>
                        {conf.icon} {conf.label}
                      </Tag>
                      {item.isCustom && (
                        <Tag className="kb-tag-custom" style={{ marginRight: 0, fontWeight: 500 }}>
                          用户自建
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
                          title="确认删除该条自定义记录？"
                          onConfirm={(e) => handleDeleteCustomItem(item.id, e)}
                          okText="删除"
                          cancelText="取消"
                        >
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={(e) => e.stopPropagation()}
                            title="删除自定义条目"
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
                    <span>💡 点击卡片可查看大字版说明</span>
                    <span style={{ color: "var(--accent)" }}>查看说明 ➔</span>
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
            <span>手动添加未收录的电脑问题记录</span>
          </div>
        }
        open={showAddModal}
        onCancel={() => setShowAddModal(false)}
        onOk={handleAddCustomItem}
        okText="保存到本地资料库"
        cancelText="取消"
        width={620}
        zIndex={1200}
        destroyOnClose
      >
        <Form form={addForm} layout="vertical" style={{ marginTop: 14 }}>
          <Form.Item
            name="title"
            label="问题名称 / 故障标题"
            rules={[{ required: true, message: "请输入直观的问题标题" }]}
          >
            <Input placeholder="例如：插入移动硬盘不识别、某办公软件打不开等..." />
          </Form.Item>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Form.Item name="severity" label="问题严重级别" initialValue="common">
              <Select
                options={[
                  { label: "🟢 常见级 (轻微/单机可绕过)", value: "common" },
                  { label: "🟡 重点级 (影响工作效率)", value: "warning" },
                  { label: "🟠 紧急级 (无法正常办公)", value: "urgent" },
                  { label: "🔴 危险级 (蓝屏/掉盘/病毒)", value: "danger" },
                ]}
              />
            </Form.Item>

            <Form.Item name="category" label="所属业务场景" initialValue="system">
              <Select
                options={[
                  { label: "系统与开机", value: "system" },
                  { label: "上网与网络", value: "network" },
                  { label: "硬盘与外设", value: "hardware" },
                  { label: "办公室打印机", value: "printer" },
                  { label: "办公与邮件", value: "office" },
                ]}
              />
            </Form.Item>
          </div>

          <Form.Item name="errorCode" label="相关错误代码 / 弹窗关键字 (选填)">
            <Input placeholder="例如：0x80070005、Access Denied..." />
          </Form.Item>

          <Form.Item
            name="symptom"
            label="电脑具体表现出的症状 (普通人能看懂的表现)"
            rules={[{ required: true, message: "请详细描述电脑出现了什么异常" }]}
          >
            <Input.TextArea
              rows={2}
              placeholder="例如：双击图标后毫无反应，任务管理器里进程一闪而过..."
            />
          </Form.Item>

          <Form.Item
            name="causeSummary"
            label="为什么会出现这个情况 (原因解释)"
            rules={[{ required: true, message: "请简要说明可能的原因" }]}
          >
            <Input.TextArea
              rows={2}
              placeholder="例如：缺少特定运行时库组件，或者被第三方杀毒误杀拦截..."
            />
          </Form.Item>

          <Form.Item name="fixActionName" label="一键修复动作名称 (选填)" initialValue="常规系统服务与缓存刷新">
            <Input placeholder="例如：重置网络栈、重启音频服务、清空缓存..." />
          </Form.Item>

          <Form.Item name="fallbackAdvice" label="若一键修复仍无法解决的指引 (选填)">
            <Input placeholder="例如：请联系企业 IT 运维老师协助重新安装对应运行时..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* 4. GitHub 云端同步中心 Modal (包含拉取与贡献上传，用户自主选择) */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CloudSyncOutlined style={{ color: "var(--accent)", fontSize: 18 }} />
            <span>GitHub 云端资料库同步中心</span>
          </div>
        }
        open={showSyncModal}
        onCancel={() => {
          setShowSyncModal(false);
          setRemoteData(null);
        }}
        footer={[
          <Button key="close" onClick={() => setShowSyncModal(false)}>
            关闭
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
              <span>从 GitHub 拉取最新资料库更新</span>
            </div>
            <div className="kb-sync-card-desc">
              自动检索由官方与全球企业运维维护的最新故障库。您可以自主决定是否合并到本地，绝不强制覆盖。
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Button
                type="primary"
                loading={remoteCheckLoading}
                onClick={handleCheckRemoteGitHub}
              >
                检查云端最新故障库
              </Button>
            </div>

            {remoteData && (
              <div
                style={{
                  marginTop: 10,
                  padding: "10px 14px",
                  background: "var(--panel)",
                  borderRadius: 8,
                  border: "1px dashed var(--accent)",
                }}
              >
                <div style={{ fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                  ☁️ 检测到云端资料库版本: {remoteData.version} (更新于 {remoteData.updatedAt})
                </div>
                <div style={{ fontSize: 12.5, color: "var(--text-2)", marginBottom: 10 }}>
                  云端共包含 {remoteData.items.length} 条精选运维故障案例。您是否选择拉取并合并至您本地的工具箱中？
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Button type="primary" onClick={handleConfirmPullRemote}>
                    确认拉取并合并到本地
                  </Button>
                  <Button onClick={() => setRemoteData(null)}>
                    暂不拉取 (保留现状)
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* 上传贡献板块 */}
          <div className="kb-sync-card">
            <div className="kb-sync-card-title">
              <CloudUploadOutlined style={{ color: "#52c41a", fontSize: 16 }} />
              <span>上传贡献您本地记录的问题至 GitHub</span>
            </div>
            <div className="kb-sync-card-desc">
              如果您在本地添加了未收录的罕见故障或办公痛点，可一键提交至 GitHub 官方仓库 Issue，帮助更多企业员工与运维解决类似问题！
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Button
                icon={<CloudUploadOutlined />}
                onClick={handleUploadContributionToGitHub}
              >
                一键向 GitHub 仓库贡献本地新记录
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* 用户端问题大字版弹窗 */}
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

      {/* 企业 IT 桌面运维工程师求助指引独立弹窗 */}
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
