use std::path::Path;
use std::process::Command;

use devops_core::{
    AppInfo, CleanupReport, CleanupScan, DnsLookupResult, InstalledApp, LogBatch, LogEntry,
    LogExport, LogQuery, LogSource, NetworkInterface, PortCheckResult, ProcessInfo,
    QuickActionResult, ScheduledTask, ServiceAction, ServiceInfo, StartupItem, SystemDiagnostics,
    SystemSnapshot,
};
use devops_plugins::{PluginCatalog, PluginMarketEntry};
use tauri::{AppHandle, State};

use crate::state::AppState;

fn to_message(error: impl std::fmt::Display) -> String {
    error.to_string()
}

#[tauri::command]
pub fn system_snapshot(state: State<'_, AppState>) -> Result<SystemSnapshot, String> {
    state.service.snapshot().map_err(to_message)
}

#[tauri::command]
pub fn process_list(state: State<'_, AppState>) -> Result<Vec<ProcessInfo>, String> {
    state.service.list_processes().map_err(to_message)
}

#[tauri::command]
pub fn process_kill(
    state: State<'_, AppState>,
    pid: u32,
    force: Option<bool>,
) -> Result<(), String> {
    state
        .service
        .kill_process(pid, force.unwrap_or(false))
        .map_err(to_message)
}

#[tauri::command]
pub async fn service_list(state: State<'_, AppState>) -> Result<Vec<ServiceInfo>, String> {
    let service = state.service.clone();
    tauri::async_runtime::spawn_blocking(move || service.list_services())
        .await
        .map_err(to_message)?
        .map_err(to_message)
}

#[tauri::command]
pub async fn service_action(
    state: State<'_, AppState>,
    name: String,
    action: ServiceAction,
) -> Result<ServiceInfo, String> {
    let service = state.service.clone();
    tauri::async_runtime::spawn_blocking(move || service.apply_service(&name, action))
        .await
        .map_err(to_message)?
        .map_err(to_message)
}

#[tauri::command]
pub async fn network_interfaces(
    state: State<'_, AppState>,
) -> Result<Vec<NetworkInterface>, String> {
    let service = state.service.clone();
    tauri::async_runtime::spawn_blocking(move || service.interfaces())
        .await
        .map_err(to_message)?
        .map_err(to_message)
}

#[tauri::command]
pub async fn network_check_port(
    state: State<'_, AppState>,
    host: String,
    port: u16,
    timeout_ms: Option<u64>,
) -> Result<PortCheckResult, String> {
    let service = state.service.clone();
    tauri::async_runtime::spawn_blocking(move || {
        service.check_port(&host, port, timeout_ms.unwrap_or(1500))
    })
    .await
    .map_err(to_message)?
    .map_err(to_message)
}

#[tauri::command]
pub async fn network_resolve(
    state: State<'_, AppState>,
    host: String,
) -> Result<DnsLookupResult, String> {
    let service = state.service.clone();
    tauri::async_runtime::spawn_blocking(move || service.resolve(&host))
        .await
        .map_err(to_message)?
        .map_err(to_message)
}

#[tauri::command]
pub async fn log_sources(state: State<'_, AppState>) -> Result<Vec<LogSource>, String> {
    let logs = state.logs.clone();
    tauri::async_runtime::spawn_blocking(move || logs.sources())
        .await
        .map_err(to_message)?
        .map_err(to_message)
}

#[tauri::command]
pub async fn logs_query(state: State<'_, AppState>, query: LogQuery) -> Result<LogBatch, String> {
    let logs = state.logs.clone();
    tauri::async_runtime::spawn_blocking(move || logs.query(query))
        .await
        .map_err(to_message)?
        .map_err(to_message)
}

#[tauri::command]
pub async fn logs_export(
    state: State<'_, AppState>,
    entries: Vec<LogEntry>,
) -> Result<LogExport, String> {
    let logs = state.logs.clone();
    tauri::async_runtime::spawn_blocking(move || logs.export(&entries))
        .await
        .map_err(to_message)?
        .map_err(to_message)
}

#[tauri::command]
pub async fn logs_clear(state: State<'_, AppState>, source: String) -> Result<(), String> {
    let logs = state.logs.clone();
    tauri::async_runtime::spawn_blocking(move || logs.clear(&source))
        .await
        .map_err(to_message)?
        .map_err(to_message)
}

#[tauri::command]
pub async fn cleanup_scan(state: State<'_, AppState>) -> Result<CleanupScan, String> {
    let cleanup = state.cleanup.clone();
    tauri::async_runtime::spawn_blocking(move || cleanup.scan())
        .await
        .map_err(to_message)?
        .map_err(to_message)
}

#[tauri::command]
pub async fn cleanup_run(
    state: State<'_, AppState>,
    ids: Vec<String>,
) -> Result<CleanupReport, String> {
    let cleanup = state.cleanup.clone();
    tauri::async_runtime::spawn_blocking(move || cleanup.clean(ids))
        .await
        .map_err(to_message)?
        .map_err(to_message)
}

#[tauri::command]
pub async fn startup_items(state: State<'_, AppState>) -> Result<Vec<StartupItem>, String> {
    let maintenance = state.maintenance.clone();
    tauri::async_runtime::spawn_blocking(move || maintenance.startup_items())
        .await
        .map_err(to_message)?
        .map_err(to_message)
}

#[tauri::command]
pub async fn startup_set_enabled(
    state: State<'_, AppState>,
    id: String,
    enabled: bool,
) -> Result<Vec<StartupItem>, String> {
    let maintenance = state.maintenance.clone();
    tauri::async_runtime::spawn_blocking(move || maintenance.set_startup_enabled(&id, enabled))
        .await
        .map_err(to_message)?
        .map_err(to_message)
}

#[tauri::command]
pub async fn scheduled_tasks(state: State<'_, AppState>) -> Result<Vec<ScheduledTask>, String> {
    let maintenance = state.maintenance.clone();
    tauri::async_runtime::spawn_blocking(move || maintenance.scheduled_tasks())
        .await
        .map_err(to_message)?
        .map_err(to_message)
}

#[tauri::command]
pub async fn task_set_enabled(
    state: State<'_, AppState>,
    id: String,
    enabled: bool,
) -> Result<Vec<ScheduledTask>, String> {
    let maintenance = state.maintenance.clone();
    tauri::async_runtime::spawn_blocking(move || maintenance.set_task_enabled(&id, enabled))
        .await
        .map_err(to_message)?
        .map_err(to_message)
}

#[tauri::command]
pub async fn software_list(state: State<'_, AppState>) -> Result<Vec<InstalledApp>, String> {
    let maintenance = state.maintenance.clone();
    tauri::async_runtime::spawn_blocking(move || maintenance.software())
        .await
        .map_err(to_message)?
        .map_err(to_message)
}

#[tauri::command]
pub async fn software_uninstall(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let maintenance = state.maintenance.clone();
    tauri::async_runtime::spawn_blocking(move || maintenance.uninstall_software(&id))
        .await
        .map_err(to_message)?
        .map_err(to_message)
}

#[tauri::command]
pub async fn diagnostics_read(state: State<'_, AppState>) -> Result<SystemDiagnostics, String> {
    let diagnostics = state.diagnostics.clone();
    tauri::async_runtime::spawn_blocking(move || diagnostics.read())
        .await
        .map_err(to_message)?
        .map_err(to_message)
}

#[tauri::command]
pub fn diagnostics_actions(state: State<'_, AppState>) -> Vec<devops_core::QuickAction> {
    state.diagnostics.quick_actions()
}

#[tauri::command]
pub async fn diagnostics_run_action(
    state: State<'_, AppState>,
    id: String,
) -> Result<QuickActionResult, String> {
    let diagnostics = state.diagnostics.clone();
    tauri::async_runtime::spawn_blocking(move || diagnostics.run_quick_action(&id))
        .await
        .map_err(to_message)?
        .map_err(to_message)
}

#[tauri::command]
pub async fn diagnostics_export(
    state: State<'_, AppState>,
    markdown: String,
) -> Result<String, String> {
    let diagnostics = state.diagnostics.clone();
    tauri::async_runtime::spawn_blocking(move || {
        diagnostics
            .export_report(&markdown)
            .map(|path| path.to_string_lossy().to_string())
    })
    .await
    .map_err(to_message)?
    .map_err(to_message)
}

#[tauri::command]
pub async fn update_check(app: AppHandle) -> Result<devops_app::update::UpdateCheck, String> {
    let current = app.package_info().version.to_string();
    tauri::async_runtime::spawn_blocking(move || devops_app::update::check_for_update(&current))
        .await
        .map_err(to_message)?
        .map_err(to_message)
}

#[tauri::command]
pub fn open_apps_features() -> Result<(), String> {
    let mut command = Command::new("control.exe");
    command.arg("appwiz.cpl");
    command.spawn().map(|_| ()).map_err(to_message)
}

#[tauri::command]
pub fn app_info(state: State<'_, AppState>) -> AppInfo {
    AppInfo {
        name: "青衫工具箱".into(),
        version: env!("CARGO_PKG_VERSION").into(),
        core_version: devops_core::CORE_VERSION.into(),
        build_profile: if cfg!(debug_assertions) {
            "debug"
        } else {
            "release"
        }
        .into(),
        platform: format!("{}-{}", std::env::consts::OS, std::env::consts::ARCH),
        is_elevated: state.service.is_elevated(),
    }
}

#[tauri::command]
pub fn is_elevated(state: State<'_, AppState>) -> bool {
    state.service.is_elevated()
}

#[tauri::command]
pub fn plugin_catalog(state: State<'_, AppState>) -> Result<PluginCatalog, String> {
    state
        .plugins
        .lock()
        .map_err(|_| "插件状态锁不可用".to_string())?
        .catalog()
        .map_err(to_message)
}

#[tauri::command]
pub fn plugin_rescan(state: State<'_, AppState>) -> Result<PluginCatalog, String> {
    state
        .plugins
        .lock()
        .map_err(|_| "插件状态锁不可用".to_string())?
        .catalog()
        .map_err(to_message)
}

#[tauri::command]
pub fn plugin_set_enabled(
    state: State<'_, AppState>,
    id: String,
    enabled: bool,
) -> Result<PluginCatalog, String> {
    state
        .plugins
        .lock()
        .map_err(|_| "插件状态锁不可用".to_string())?
        .set_enabled(&id, enabled)
        .map_err(to_message)
}

#[tauri::command]
pub fn plugin_market(state: State<'_, AppState>) -> Result<Vec<PluginMarketEntry>, String> {
    state
        .plugins
        .lock()
        .map_err(|_| "插件状态锁不可用".to_string())?
        .market()
        .map_err(to_message)
}

#[tauri::command]
pub fn plugin_install(state: State<'_, AppState>, id: String) -> Result<PluginCatalog, String> {
    state
        .plugins
        .lock()
        .map_err(|_| "插件状态锁不可用".to_string())?
        .install(&id)
        .map_err(to_message)
}

#[tauri::command]
pub fn plugin_install_from_path(
    state: State<'_, AppState>,
    path: String,
) -> Result<PluginCatalog, String> {
    state
        .plugins
        .lock()
        .map_err(|_| "插件状态锁不可用".to_string())?
        .install_from_path(&path)
        .map_err(to_message)
}

#[tauri::command]
pub fn plugin_remove(state: State<'_, AppState>, id: String) -> Result<PluginCatalog, String> {
    state
        .plugins
        .lock()
        .map_err(|_| "插件状态锁不可用".to_string())?
        .remove(&id)
        .map_err(to_message)
}

#[tauri::command]
pub fn plugin_open_directory(state: State<'_, AppState>) -> Result<String, String> {
    let directory = state
        .plugins
        .lock()
        .map_err(|_| "插件状态锁不可用".to_string())?
        .directory()
        .to_path_buf();
    open_path(&directory)?;
    Ok(directory.display().to_string())
}

#[tauri::command]
pub fn open_external_url(url: String) -> Result<(), String> {
    let url = url.trim();
    if url.len() > 2048
        || !(url.starts_with("https://") || url.starts_with("http://"))
        || url.chars().any(|c| c.is_whitespace() || c.is_control())
    {
        return Err("只允许打开 http(s) 链接".into());
    }
    open_target(url)?;
    Ok(())
}

fn open_path(path: &Path) -> Result<(), String> {
    open_target(path.as_os_str().to_string_lossy().as_ref())
}

fn open_target(target: &str) -> Result<(), String> {
    #[cfg(windows)]
    let mut command = Command::new("explorer.exe");
    #[cfg(not(windows))]
    let mut command = Command::new("xdg-open");

    command.arg(target).spawn().map(|_| ()).map_err(to_message)
}

#[tauri::command]
pub fn set_window_theme(window: tauri::WebviewWindow, dark: bool) -> Result<(), String> {
    window
        .set_theme(Some(if dark {
            tauri::Theme::Dark
        } else {
            tauri::Theme::Light
        }))
        .map_err(to_message)
}

#[tauri::command]
pub fn relaunch_as_admin(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    state.service.relaunch_elevated().map_err(to_message)?;
    app.exit(0);
    Ok(())
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeFixResult {
    pub success: bool,
    pub title: String,
    pub detail: String,
    pub contact_support_tip: String,
}

#[tauri::command]
pub async fn knowledge_try_fix(id: String) -> Result<KnowledgeFixResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let (title, script, detail, fallback_contact) = match id.as_str() {
            "dt-net-winsock-reset" => (
                "Winsock 与网络协议栈一键重置",
                "netsh winsock reset; netsh int ip reset; ipconfig /flushdns",
                "已重置系统 Winsock 目录、恢复 TCP/IP 协议栈默认状态并刷新了本地 DNS 解析缓存。建议稍后重启电脑生效。",
                "若重启电脑后网页仍打不开，可能存在企业域代理、上级网关限制或网卡硬件异常，请联系企业 IT 桌面运维人员排查。"
            ),
            "dt-printer-spooler-crash" => (
                "打印后台 Spooler 崩溃与假脱机缓存清理",
                "Stop-Service spooler -Force -ErrorAction SilentlyContinue; Remove-Item -Path \"$env:SystemRoot\\System32\\spool\\PRINTERS\\*\" -Force -Recurse -ErrorAction SilentlyContinue; Start-Service spooler -ErrorAction SilentlyContinue",
                "已安全停止 Spooler 打印服务，清空了 PRINTERS 目录所有损坏积压的假脱机任务碎片，并重新启动了打印服务。",
                "若打印服务仍旧频繁崩溃闪退，通常是某个破损的第三方旧版打印机驱动导致，请联系企业 IT 桌面运维人员协助卸载该故障驱动包。"
            ),
            "dt-sys-explorer-hang" => (
                "假死资源管理器 (Explorer) 重启",
                "Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue; Start-Sleep -Milliseconds 600; Start-Process explorer",
                "已强制终止僵死挂起的 Windows 资源管理器进程，并重新拉起了全新的桌面、任务栏与托盘实例。",
                "若桌面或右键仍旧卡顿转圈，多由第三方右键菜单 Shell 扩展插件死锁导致，请联系企业 IT 运维人员协助清理右键扩展。"
            ),
            "dt-net-ip-conflict" => (
                "IP 租约释放与 DHCP 重新获取",
                "ipconfig /release; ipconfig /renew",
                "已主动释放当前网卡的 IP 租约，并向企业合法 DHCP 服务器申请重新分配全新 IP 地址与子网配置。",
                "若依然无法上网或反复提示 IP 冲突，说明局域网内存在私接路由器 DHCP 泛洪或地址池耗尽，请联系企业网络管理员排查交换机端口。"
            ),
            "dt-printer-11b-709" => (
                "网络共享打印机 0x11b/709 策略兼容修正",
                "Set-ItemProperty -Path \"HKLM:\\System\\CurrentControlSet\\Control\\Print\" -Name \"RpcAuthnLevelPrivacyEnabled\" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue; Restart-Service spooler -Force -ErrorAction SilentlyContinue",
                "已配置注册表允许 RPC 匿名通信（规避微软补丁对无域环境共享打印的安全拦截），并重启了本地打印服务。",
                "若客户端仍旧提示 0x11b 或 0x709，请确保连接打印机的【主机端电脑】也同样应用了此修复，或联系企业 IT 运维人员配置 TCP/IP 直连端口。"
            ),
            "dt-rdp-credssp" => (
                "远程桌面 CredSSP 凭据加密 Oracle 兼容修复",
                "if (!(Test-Path \"HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System\\CredSSP\\Parameters\")) { New-Item -Path \"HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System\\CredSSP\\Parameters\" -Force | Out-Null }; Set-ItemProperty -Path \"HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System\\CredSSP\\Parameters\" -Name \"AllowEncryptionOracle\" -Value 2 -Type DWord -Force -ErrorAction SilentlyContinue",
                "已将本机的远程桌面凭据加密 Oracle 验证策略临时调整为宽松兼容模式，可正常连接未打补丁的老旧服务器。",
                "若仍无法连接远程机器，请联系企业 IT 桌面运维人员检查目标服务器的 Remote Desktop 服务状态及防火墙端口配置。"
            ),
            "dt-usb-gpo-block" => (
                "存储介质写保护状态解除",
                "if (Test-Path \"HKLM:\\SYSTEM\\CurrentControlSet\\Control\\StorageDevicePolicies\") { Set-ItemProperty -Path \"HKLM:\\SYSTEM\\CurrentControlSet\\Control\\StorageDevicePolicies\" -Name \"WriteProtect\" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue }",
                "已检测并重置本地注册表 StorageDevicePolicies 写入保护标志。",
                "若重新拔插 U 盘后依然提示“访问被拒绝”或写保护，说明属于企业域控强制下发的防泄密安全管控策略，请联系企业 IT 安全管理员申请临时合规权限。"
            ),
            "dt-sys-update-loop" => (
                "Windows Update 缓存重置与服务刷新",
                "Stop-Service wuauserv -Force -ErrorAction SilentlyContinue; Rename-Item -Path \"$env:SystemRoot\\SoftwareDistribution\" -NewName \"SoftwareDistribution.old.$((Get-Date).Ticks)\" -Force -ErrorAction SilentlyContinue; Start-Service wuauserv -ErrorAction SilentlyContinue",
                "已安全停止 Windows Update 服务，并将可能损坏的更新临时缓存目录（SoftwareDistribution）更名重置。",
                "若开机仍旧陷入更新撤销死循环，多为底层 WinSXS 组件存储损坏，请联系企业 IT 桌面运维人员使用专业维护盘进行离线镜像修复。"
            ),
            "dt-office-kms-activate" => (
                "企业时钟校准与批量激活探测",
                "w32tm /resync -ErrorAction SilentlyContinue; cscript //nologo \"$env:SystemRoot\\System32\\slmgr.vbs\" /ato",
                "已强制同步系统网络时钟（防止时间偏差导致鉴权失败），并向企业 KMS 授权通道发送了重新激活请求。",
                "若提示 0xC004F074 或激活无法连接，说明当前办公电脑未连入公司内网/VPN，或企业 KMS 授权证书到期，请联系企业 IT 运维人员配置激活环境。"
            ),
            "dt-office-outlook-pst" => (
                "Outlook 挂起进程清理与安全模式启动",
                "Stop-Process -Name outlook -Force -ErrorAction SilentlyContinue; Start-Sleep -Milliseconds 500; Start-Process \"outlook.exe\" -ArgumentList \"/safe\" -ErrorAction SilentlyContinue",
                "已强制终止后台死锁的 Outlook 进程，并尝试以 /safe 纯净无插件安全模式唤起客户端。",
                "若安全模式下依然无法加载，说明本地 .ost 数据文件索引严重受损，请联系企业 IT 桌面运维人员协助运行 SCANPST 修复或重新拉取云端邮箱配置。"
            ),
            "dt-bsod-dump" => (
                "系统完整性检测准备",
                "Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version, LastBootUpTime",
                "已采集系统版本与启动状态信息。系统核心组件修复需要执行完整 DISM 与 SFC 流程。",
                "蓝屏崩溃（BSOD）多与内存金手指接触不良、SSD 坏道或特定内核驱动冲突有关。若近期仍旧反复蓝屏，请联系企业 IT 桌面运维人员提取 Minidump 日志协助硬件检修。"
            ),
            "dt-disk-smart-io" => (
                "磁盘文件系统在线只读健康检查",
                "Get-PhysicalDisk | Select-Object FriendlyName, MediaType, HealthStatus, OperationalStatus",
                "已执行磁盘介质硬件健康状态检测（SMART 状态自检）。",
                "【重要警告】若固态或机械硬盘存在物理坏道或掉盘，切勿盲目写盘！请第一时间联系企业 IT 桌面运维人员协助进行关键文件冷备份并更换硬盘。"
            ),
            "dt-malware-miner" => (
                "异常网络外联与高负载应急采集",
                "Get-NetTCPConnection -State Established | Select-Object LocalAddress, LocalPort, RemoteAddress, RemotePort, OwningProcess -First 15",
                "已采集当前活动外联连接与涉事进程 ID。",
                "【极度危险】办公电脑疑似被植入挖矿病毒或勒索木马！请立即拔掉物理网线并关闭 Wi-Fi 物理隔离，第一时间致电企业信息安全团队或 IT 桌面支持人员进行专项处置！"
            ),
            "dt-ad-trust-failed" => (
                "计算机域信任关系安全通道检测",
                "Test-ComputerSecureChannel -Verbose -ErrorAction SilentlyContinue",
                "已执行计算机与企业域控制器之间的加密安全信任通道探活。",
                "域信任关系中断需要域管理员凭据授权修复，请联系企业 IT 域控管理员提供远程重置安全通道支持。"
            ),
            "dt-boot-bcd" => (
                "UEFI 引导结构诊断",
                "bcdedit /enum \"{current}\"",
                "已读取当前 Windows 启动配置数据（BCD）参数。",
                "开机引导丢失（BCD 损坏 / 找不到操作系统）涉及底层 ESP 分区与磁盘主引导记录，请联系企业 IT 桌面运维人员携带 PE 维护盘到现场执行系统引导重构。"
            ),
            "dt-user-temp-profile" => (
                "用户 Profile 注册表状态检测",
                "Get-ItemProperty \"HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\ProfileList\\*\" | Select-Object PSChildName, ProfileImagePath",
                "已扫描注册表 ProfileList 状态，排查是否存在原用户配置文件的映射异常。",
                "临时配置文件系原账户注册表 NTUSER.DAT 被锁引发。为防止数据丢失，请切勿在临时桌面保存新工作文件，并立即联系企业 IT 桌面运维人员协助修复注册表映射。"
            ),
            "dt-printer-offline" => (
                "打印服务刷新与局域网 ARP 缓存清理",
                "Restart-Service spooler -Force -ErrorAction SilentlyContinue; netsh interface ip delete arpcache",
                "已清空局域网 ARP 硬件地址缓存，并重启了本地打印假脱机服务。",
                "若网络打印机仍旧显示脱机，请在控制面板打印机属性的端口设置中取消勾选【启用 SNMP 状态】，或联系企业 IT 桌面运维人员检查打印机 IP 联通状态。"
            ),
            _ => (
                "常规系统排查",
                "ipconfig /flushdns",
                "已执行常规排障尝试并刷新 DNS 缓存。",
                "若问题仍未解决，请联系企业 IT 桌面运维人员协助排查。"
            ),
        };

        let mut command = std::process::Command::new("powershell.exe");
        command.args([
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            script,
        ]);
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            command.creation_flags(0x0800_0000);
        }

        let output = command.output();
        let (success, extra) = match output {
            Ok(out) => {
                let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
                let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
                if out.status.success() {
                    (true, if stdout.is_empty() { String::new() } else { format!("\n执行反馈: {}", stdout) })
                } else {
                    (false, if stderr.is_empty() { String::new() } else { format!("\n异常提示: {}", stderr) })
                }
            }
            Err(e) => (false, format!("\n无法调用修复执行器: {}", e)),
        };

        Ok(KnowledgeFixResult {
            success,
            title: title.to_string(),
            detail: format!("{}{}", detail, extra),
            contact_support_tip: fallback_contact.to_string(),
        })
    })
    .await
    .map_err(|e| e.to_string())?
}
