use std::path::PathBuf;
use std::sync::Mutex;

use devops_app::OpsService;
use devops_core::OpsResult;
use devops_platform::DesktopPlatform;
use devops_plugins::PluginStore;

/// Shared state injected into every Tauri command. Commands only adapt IPC
/// arguments; orchestration lives in `devops_app::OpsService`.
pub struct AppState {
    pub service: OpsService,
    pub plugins: Mutex<PluginStore>,
}

impl AppState {
    pub fn new(plugin_directory: PathBuf) -> OpsResult<Self> {
        let platform = DesktopPlatform::new()?;
        Ok(Self {
            service: OpsService::new(
                platform.system,
                platform.processes,
                platform.services,
                platform.network,
                platform.elevation,
            ),
            plugins: Mutex::new(PluginStore::new(plugin_directory)),
        })
    }
}
