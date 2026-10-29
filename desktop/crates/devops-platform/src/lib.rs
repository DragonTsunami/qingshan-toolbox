//! Platform adapters. The Tauri shell only ever talks to the traits defined in
//! `devops-core`, which keeps the door open for a Linux/macOS agent and for a
//! server-side implementation of the same commands.

use std::sync::Arc;

use devops_core::{
    Elevation, LogCenter, NetworkProbe, OpsResult, ProcessControl, ServiceControl, SystemProbe,
};

#[cfg(windows)]
mod win;

/// Concrete bundle of platform capabilities injected into the Tauri state.
pub struct DesktopPlatform {
    pub system: Arc<dyn SystemProbe>,
    pub processes: Arc<dyn ProcessControl>,
    pub services: Arc<dyn ServiceControl>,
    pub network: Arc<dyn NetworkProbe>,
    pub elevation: Arc<dyn Elevation>,
    pub logs: Arc<dyn LogCenter>,
}

impl DesktopPlatform {
    #[cfg(windows)]
    pub fn new() -> OpsResult<Self> {
        let win = win::WindowsPlatform::new();
        Ok(Self {
            system: Arc::new(win.system),
            processes: Arc::new(win.processes),
            services: Arc::new(win.services),
            network: Arc::new(win.network),
            elevation: Arc::new(win.elevation),
            logs: Arc::new(win.logs),
        })
    }

    #[cfg(not(windows))]
    pub fn new() -> OpsResult<Self> {
        Err(devops_core::OpsError::Platform(
            "当前构建仅包含 Windows 平台适配器".into(),
        ))
    }
}
