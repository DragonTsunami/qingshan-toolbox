use devops_core::{
    AppInfo, DnsLookupResult, NetworkInterface, PortCheckResult, ProcessInfo, ServiceAction,
    ServiceInfo, SystemSnapshot,
};
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
