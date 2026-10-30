pub mod commands;
pub mod state;

use std::path::PathBuf;

use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

use state::AppState;

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let plugin_directory = app
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| std::env::temp_dir().join("qingshan-toolbox"))
                .join("plugins");
            app.manage(AppState::new(plugin_directory)?);

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
