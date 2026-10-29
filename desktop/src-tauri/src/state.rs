use devops_app::OpsService;
use devops_core::OpsResult;
use devops_platform::DesktopPlatform;

/// Shared state injected into every Tauri command. Commands only adapt IPC
/// arguments; orchestration lives in `devops_app::OpsService`.
pub struct AppState {
    pub service: OpsService,
}

impl AppState {
    pub fn new() -> OpsResult<Self> {
        let platform = DesktopPlatform::new()?;
        Ok(Self {
            service: OpsService::new(
                platform.system,
                platform.processes,
                platform.services,
                platform.network,
                platform.elevation,
            ),
        })
    }
}
