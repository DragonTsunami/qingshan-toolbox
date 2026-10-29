//! Application service layer.
//!
//! The Tauri command module is intentionally thin: it only adapts IPC arguments
//! and schedules blocking work. All orchestration and cross-cutting guards live
//! here, which keeps the same behavior testable without a webview or a Windows
//! host. The service depends exclusively on `devops-core` traits.

use std::sync::Arc;

use devops_core::{
    DnsLookupResult, Elevation, NetworkInterface, NetworkProbe, OpsError, OpsResult,
    PortCheckResult, ProcessControl, ProcessInfo, ServiceAction, ServiceControl, ServiceInfo,
    SystemProbe, SystemSnapshot,
};

/// Composed use cases for the desktop client.
#[derive(Clone)]
pub struct OpsService {
    system: Arc<dyn SystemProbe>,
    processes: Arc<dyn ProcessControl>,
    services: Arc<dyn ServiceControl>,
    network: Arc<dyn NetworkProbe>,
    elevation: Arc<dyn Elevation>,
}

impl OpsService {
    pub fn new(
        system: Arc<dyn SystemProbe>,
        processes: Arc<dyn ProcessControl>,
        services: Arc<dyn ServiceControl>,
        network: Arc<dyn NetworkProbe>,
        elevation: Arc<dyn Elevation>,
    ) -> Self {
        Self {
            system,
            processes,
            services,
            network,
            elevation,
        }
    }

    pub fn snapshot(&self) -> OpsResult<SystemSnapshot> {
        self.system.snapshot()
    }

    pub fn list_processes(&self) -> OpsResult<Vec<ProcessInfo>> {
        self.processes.list()
    }

    /// Terminate a process, refusing to target the running 青衫工具箱 instance.
    /// The guard lives at the application boundary so every caller inherits it,
    /// including future web/CLI front ends built on this service.
    pub fn kill_process(&self, pid: u32, force: bool) -> OpsResult<()> {
        if pid == std::process::id() {
            return Err(OpsError::InvalidInput("不能终止青衫工具箱自身进程".into()));
        }
        self.processes.kill(pid, force)
    }

    pub fn list_services(&self) -> OpsResult<Vec<ServiceInfo>> {
        self.services.list()
    }

    pub fn apply_service(&self, name: &str, action: ServiceAction) -> OpsResult<ServiceInfo> {
        let name = name.trim();
        if name.is_empty() {
            return Err(OpsError::InvalidInput("服务名称不能为空".into()));
        }
        self.services.apply(name, action)
    }

    pub fn interfaces(&self) -> OpsResult<Vec<NetworkInterface>> {
        self.network.interfaces()
    }

    pub fn check_port(&self, host: &str, port: u16, timeout_ms: u64) -> OpsResult<PortCheckResult> {
        if host.trim().is_empty() {
            return Err(OpsError::InvalidInput("主机地址不能为空".into()));
        }
        if port == 0 {
            return Err(OpsError::InvalidInput("端口必须大于 0".into()));
        }
        self.network.check_port(host.trim(), port, timeout_ms)
    }

    pub fn resolve(&self, host: &str) -> OpsResult<DnsLookupResult> {
        if host.trim().is_empty() {
            return Err(OpsError::InvalidInput("主机地址不能为空".into()));
        }
        self.network.resolve(host.trim())
    }

    pub fn is_elevated(&self) -> bool {
        self.elevation.is_elevated()
    }

    pub fn relaunch_elevated(&self) -> OpsResult<()> {
        self.elevation.relaunch_elevated()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn service_is_send_and_sync() {
        fn assert_send_sync<T: Send + Sync>() {}
        assert_send_sync::<OpsService>();
    }
}
