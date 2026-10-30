pub mod commands;
pub mod state;

use std::io::Write;
use std::path::PathBuf;

use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent};

use state::AppState;

#[cfg(windows)]
use std::sync::OnceLock;
#[cfg(windows)]
use windows_sys::Win32::Foundation::{CloseHandle, GetLastError, ERROR_ALREADY_EXISTS};
#[cfg(windows)]
use windows_sys::Win32::System::Threading::CreateMutexW;
#[cfg(windows)]
use windows_sys::Win32::UI::WindowsAndMessaging::{
    FindWindowW, SetForegroundWindow, ShowWindow, SW_RESTORE,
};

#[cfg(windows)]
static INSTANCE_MUTEX: OnceLock<isize> = OnceLock::new();

fn wide(value: &str) -> Vec<u16> {
    value.encode_utf16().chain(std::iter::once(0)).collect()
}

/// Keep a single interactive instance. A second launch focuses the existing
/// window instead of creating another WebView2 profile and duplicate tray icon.
#[cfg(windows)]
fn claim_single_instance() -> bool {
    let name = wide("Local\\QingshanToolbox.SingleInstance");
    let handle = unsafe { CreateMutexW(std::ptr::null(), 0, name.as_ptr()) };
    if handle.is_null() {
        return true;
    }
    let already_running = unsafe { GetLastError() } == ERROR_ALREADY_EXISTS;
    if already_running {
        unsafe { CloseHandle(handle) };
        focus_existing_window();
        return false;
    }
    let _ = INSTANCE_MUTEX.set(handle as isize);
    true
}

#[cfg(windows)]
fn focus_existing_window() {
    let title = wide("青衫工具箱");
    let window = unsafe { FindWindowW(std::ptr::null(), title.as_ptr()) };
    if !window.is_null() {
        unsafe {
            ShowWindow(window, SW_RESTORE);
            SetForegroundWindow(window);
        }
    }
}

#[cfg(not(windows))]
fn claim_single_instance() -> bool {
    true
}

fn show_main(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn setup_tray(app: &tauri::AppHandle) -> tauri::Result<()> {
    let show = MenuItemBuilder::with_id("show", "显示主界面").build(app)?;
    let quit = MenuItemBuilder::with_id("quit", "退出青衫工具箱").build(app)?;
    let menu = MenuBuilder::new(app).items(&[&show, &quit]).build()?;

    let mut builder = TrayIconBuilder::with_id("qingshan-tray")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .tooltip("青衫工具箱")
        .on_menu_event(|app, event| match event.id().as_ref() {
            "show" => show_main(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main(tray.app_handle());
            }
        });

    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    builder.build(app)?;
    Ok(())
}

/// Persist a local crash record before the default panic output. No network or
/// credential data is included; this is the user-facing feedback path for v0.6.
fn install_panic_hook() {
    let previous = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        let directory = std::env::var_os("APPDATA")
            .map(PathBuf::from)
            .unwrap_or_else(std::env::temp_dir)
            .join("com.qingshan.toolbox")
            .join("logs");
        let _ = std::fs::create_dir_all(&directory);
        let stamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|value| value.as_secs())
            .unwrap_or(0);
        let path = directory.join(format!("panic-{stamp}.log"));
        if let Ok(mut file) = std::fs::File::create(&path) {
            let message = info
                .payload()
                .downcast_ref::<&str>()
                .copied()
                .or_else(|| info.payload().downcast_ref::<String>().map(String::as_str))
                .unwrap_or("unknown panic");
            let location = info
                .location()
                .map(|value| format!("{}:{}:{}", value.file(), value.line(), value.column()))
                .unwrap_or_else(|| "unknown".into());
            let _ = writeln!(
                file,
                "青衫工具箱崩溃记录\n时间: {stamp}\n位置: {location}\n信息: {message}\n"
            );
            let _ = writeln!(file, "\n{}", std::backtrace::Backtrace::force_capture());
        }
        previous(info);
    }));
}

pub fn run() {
    if !claim_single_instance() {
        return;
    }
    install_panic_hook();

    tauri::Builder::default()
        .setup(|app| {
            let app_data = app
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| std::env::temp_dir().join("qingshan-toolbox"));
            let plugin_directory = app_data.join("plugins");
            let report_directory = app_data.join("reports");
            app.manage(AppState::new(plugin_directory, report_directory)?);

            // WebView2 needs a writable user-data directory. Enterprise
            // deployments can redirect it (portable installs, restricted
            // endpoints, shared terminals); otherwise use the per-user default.
            let data_dir = std::env::var_os("QINGSHAN_WEBVIEW_DATA")
                .or_else(|| std::env::var_os("OPSDECK_WEBVIEW_DATA"))
                .map(PathBuf::from)
                .unwrap_or_else(|| {
                    app.path()
                        .app_local_data_dir()
                        .unwrap_or_else(|_| std::env::temp_dir().join("qingshan-webview"))
                });
            std::fs::create_dir_all(&data_dir)?;

            let build_window = |directory: PathBuf| {
                WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                    .title("青衫工具箱")
                    .inner_size(1200.0, 800.0)
                    .min_inner_size(900.0, 600.0)
                    .maximized(true)
                    .center()
                    .data_directory(directory)
                    .build()
                    .map(|_| ())
            };

            if let Err(primary_error) = build_window(data_dir.clone()) {
                // A stale or still-running copy can keep the default WebView2
                // profile locked. Retry with a sibling profile so the window
                // still opens instead of failing silently.
                let fallback_name = data_dir
                    .file_name()
                    .map(|name| format!("{}-2", name.to_string_lossy()))
                    .unwrap_or_else(|| "qingshan-webview-2".to_string());
                let fallback = data_dir.with_file_name(fallback_name);
                std::fs::create_dir_all(&fallback)?;
                build_window(fallback).map_err(|_| primary_error)?;
            }

            if let Some(window) = app.get_webview_window("main") {
                let hide_window = window.clone();
                window.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = hide_window.hide();
                    }
                });
            }
            setup_tray(app.handle())?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::system_snapshot,
            commands::process_list,
            commands::process_kill,
            commands::service_list,
            commands::service_action,
            commands::network_interfaces,
            commands::network_check_port,
            commands::network_resolve,
            commands::log_sources,
            commands::logs_query,
            commands::logs_export,
            commands::cleanup_scan,
            commands::cleanup_run,
            commands::startup_items,
            commands::startup_set_enabled,
            commands::scheduled_tasks,
            commands::task_set_enabled,
            commands::software_list,
            commands::software_uninstall,
            commands::diagnostics_read,
            commands::diagnostics_actions,
            commands::diagnostics_run_action,
            commands::diagnostics_export,
            commands::update_check,
            commands::open_apps_features,
            commands::app_info,
            commands::is_elevated,
            commands::plugin_catalog,
            commands::plugin_rescan,
            commands::plugin_set_enabled,
            commands::plugin_market,
            commands::plugin_install,
            commands::plugin_install_from_path,
            commands::plugin_remove,
            commands::plugin_open_directory,
            commands::open_external_url,
            commands::set_window_theme,
            commands::relaunch_as_admin,
        ])
        .run(tauri::generate_context!())
        .expect("启动青衫工具箱失败");
}
