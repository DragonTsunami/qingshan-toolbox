use crate::error::OpsResult;
use crate::logs::{LogBatch, LogEntry, LogExport, LogQuery, LogSource};
use crate::models::{
    DnsLookupResult, NetworkInterface, PortCheckResult, ProcessInfo, ServiceAction, ServiceInfo,
    SystemSnapshot,
};

/// Read-only machine telemetry.
pub trait SystemProbe: Send + Sync {
    fn snapshot(&self) -> OpsResult<SystemSnapshot>;
}

/// Process inspection and termination.
pub trait ProcessControl: Send + Sync {
    fn list(&self) -> OpsResult<Vec<ProcessInfo>>;
    fn kill(&self, pid: u32, force: bool) -> OpsResult<()>;
}

/// Windows service inspection and lifecycle control.
pub trait ServiceControl: Send + Sync {
    fn list(&self) -> OpsResult<Vec<ServiceInfo>>;
    fn apply(&self, name: &str, action: ServiceAction) -> OpsResult<ServiceInfo>;
}

/// Network inventory and diagnostics.
pub trait NetworkProbe: Send + Sync {
    fn interfaces(&self) -> OpsResult<Vec<NetworkInterface>>;
    fn check_port(&self, host: &str, port: u16, timeout_ms: u64) -> OpsResult<PortCheckResult>;
    fn resolve(&self, host: &str) -> OpsResult<DnsLookupResult>;
}

/// Windows Event Log / application log inspection and export.
pub trait LogCenter: Send + Sync {
    fn sources(&self) -> OpsResult<Vec<LogSource>>;
    fn query(&self, query: &LogQuery) -> OpsResult<LogBatch>;
    /// Write the selected entries to a local file and return its path.
    fn export(&self, entries: &[LogEntry]) -> OpsResult<LogExport>;
}

/// Elevation state and self-relaunch. Kept separate because it is the only
/// capability that mutates the process environment rather than the machine.
pub trait Elevation: Send + Sync {
    fn is_elevated(&self) -> bool;
    /// Relaunch the current executable with the Windows UAC prompt.
    fn relaunch_elevated(&self) -> OpsResult<()>;
}
