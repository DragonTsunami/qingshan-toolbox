//! Deterministic in-memory adapters for framework tests.
//!
//! The testkit implements every `devops-core` capability trait and records the
//! calls it receives. It has no Windows dependency, so the application layer can
//! be tested on any CI host.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};

use devops_core::{
    DnsLookupResult, Elevation, NetworkInterface, NetworkProbe, OpsError, OpsResult,
    PortCheckResult, ProcessControl, ProcessInfo, ServiceAction, ServiceControl, ServiceInfo,
    ServiceStatus, SystemProbe, SystemSnapshot,
};

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

pub fn sample_snapshot() -> SystemSnapshot {
    SystemSnapshot {
        hostname: "OPS-MOCK".into(),
        os_name: "Windows 11 Pro".into(),
        os_version: "24H2".into(),
        kernel_version: "10.0.26100".into(),
        arch: "x86_64".into(),
        uptime_secs: 9_000,
        boot_time: 1_700_000_000,
        cpu_brand: "Test CPU".into(),
        physical_cores: 4,
        logical_cores: 8,
        cpu_usage: 12.5,
        per_core_usage: vec![10.0, 20.0, 5.0, 15.0],
        memory_total: 16 * 1024 * 1024 * 1024,
        memory_used: 8 * 1024 * 1024 * 1024,
        swap_total: 2 * 1024 * 1024 * 1024,
        swap_used: 512 * 1024 * 1024,
        disks: vec![devops_core::DiskInfo {
            name: "System".into(),
            mount_point: "C:\\".into(),
            file_system: "NTFS".into(),
            total: 512 * 1024 * 1024 * 1024,
            available: 256 * 1024 * 1024 * 1024,
            removable: false,
        }],
        is_elevated: false,
    }
}

pub fn sample_processes() -> Vec<ProcessInfo> {
    vec![
        ProcessInfo {
            pid: 4242,
            name: "mock-worker.exe".into(),
            exe: Some("C:\\Mock\\mock-worker.exe".into()),
            command: "mock-worker.exe --serve".into(),
            cpu_usage: 2.5,
            memory: 128 * 1024 * 1024,
            virtual_memory: 256 * 1024 * 1024,
            status: "运行中".into(),
            user: Some("tester".into()),
            start_time: 1_700_000_100,
        },
        ProcessInfo {
            pid: 9999,
            name: "opsdeck.exe".into(),
            exe: Some("C:\\Mock\\opsdeck.exe".into()),
            command: "opsdeck.exe".into(),
            cpu_usage: 0.4,
            memory: 64 * 1024 * 1024,
            virtual_memory: 96 * 1024 * 1024,
            status: "运行中".into(),
            user: Some("tester".into()),
            start_time: 1_700_000_200,
        },
    ]
}

pub fn sample_services() -> Vec<ServiceInfo> {
    vec![
        ServiceInfo {
            name: "MockSvc".into(),
            display_name: "Mock Service".into(),
            status: ServiceStatus::Running,
            start_type: "auto".into(),
            process_id: 4242,
            can_stop: true,
        },
        ServiceInfo {
            name: "MockStopped".into(),
            display_name: "Mock Stopped Service".into(),
            status: ServiceStatus::Stopped,
            start_type: "manual".into(),
            process_id: 0,
            can_stop: true,
        },
    ]
}

pub fn sample_interfaces() -> Vec<NetworkInterface> {
    vec![NetworkInterface {
        name: "Ethernet".into(),
        mac: "00-11-22-33-44-55".into(),
        ipv4: vec!["192.0.2.10".into()],
        ipv6: vec!["2001:db8::10".into()],
        is_loopback: false,
        is_up: true,
        total_received: 1024,
        total_transmitted: 512,
    }]
}

pub fn sample_port_result() -> PortCheckResult {
    PortCheckResult {
        host: "127.0.0.1".into(),
        port: 443,
        open: true,
        latency_ms: 12,
        error: None,
    }
}

pub fn sample_dns_result() -> DnsLookupResult {
    DnsLookupResult {
        host: "example.com".into(),
        addresses: vec!["127.0.0.1".into()],
        latency_ms: 4,
        error: None,
    }
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

pub struct MockSystem {
    pub snapshot: SystemSnapshot,
    pub fail: bool,
}

impl MockSystem {
    pub fn new() -> Self {
        Self {
            snapshot: sample_snapshot(),
            fail: false,
        }
    }

    pub fn failing() -> Self {
        Self {
            snapshot: sample_snapshot(),
            fail: true,
        }
    }
}

impl Default for MockSystem {
    fn default() -> Self {
        Self::new()
    }
}

impl SystemProbe for MockSystem {
    fn snapshot(&self) -> OpsResult<SystemSnapshot> {
        if self.fail {
            return Err(OpsError::Platform("mock snapshot failure".into()));
        }
        Ok(self.snapshot.clone())
    }
}

pub struct MockProcesses {
    processes: Mutex<Vec<ProcessInfo>>,
    killed: Mutex<Vec<(u32, bool)>>,
    pub fail_list: bool,
}

impl MockProcesses {
    pub fn new() -> Self {
        Self {
            processes: Mutex::new(sample_processes()),
            killed: Mutex::new(Vec::new()),
            fail_list: false,
        }
    }

    pub fn with_processes(processes: Vec<ProcessInfo>) -> Self {
        Self {
            processes: Mutex::new(processes),
            killed: Mutex::new(Vec::new()),
            fail_list: false,
        }
    }

    pub fn killed_calls(&self) -> Vec<(u32, bool)> {
        self.killed.lock().expect("mock lock").clone()
    }
}

impl Default for MockProcesses {
    fn default() -> Self {
        Self::new()
    }
}

impl ProcessControl for MockProcesses {
    fn list(&self) -> OpsResult<Vec<ProcessInfo>> {
        if self.fail_list {
            return Err(OpsError::Platform("mock process list failure".into()));
        }
        Ok(self.processes.lock().expect("mock lock").clone())
    }

    fn kill(&self, pid: u32, force: bool) -> OpsResult<()> {
        self.killed.lock().expect("mock lock").push((pid, force));
        let mut processes = self.processes.lock().expect("mock lock");
        let Some(index) = processes.iter().position(|process| process.pid == pid) else {
            return Err(OpsError::NotFound(format!("PID {pid}")));
        };
        processes.remove(index);
        Ok(())
    }
}

pub struct MockServices {
    services: Mutex<Vec<ServiceInfo>>,
    actions: Mutex<Vec<(String, ServiceAction)>>,
    pub fail: bool,
}

impl MockServices {
    pub fn new() -> Self {
        Self {
            services: Mutex::new(sample_services()),
            actions: Mutex::new(Vec::new()),
            fail: false,
        }
    }

    pub fn action_calls(&self) -> Vec<(String, ServiceAction)> {
        self.actions.lock().expect("mock lock").clone()
    }
}

impl Default for MockServices {
    fn default() -> Self {
        Self::new()
    }
}

impl ServiceControl for MockServices {
    fn list(&self) -> OpsResult<Vec<ServiceInfo>> {
        if self.fail {
            return Err(OpsError::Platform("mock service list failure".into()));
        }
        Ok(self.services.lock().expect("mock lock").clone())
    }

    fn apply(&self, name: &str, action: ServiceAction) -> OpsResult<ServiceInfo> {
        self.actions
            .lock()
            .expect("mock lock")
            .push((name.to_string(), action));

        let mut services = self.services.lock().expect("mock lock");
        let Some(service) = services.iter_mut().find(|service| service.name == name) else {
            return Err(OpsError::NotFound(format!("service {name}")));
        };
        service.status = match action {
            ServiceAction::Stop => ServiceStatus::Stopped,
            ServiceAction::Start | ServiceAction::Restart => ServiceStatus::Running,
        };
        Ok(service.clone())
    }
}

pub struct MockNetwork {
    interfaces: Vec<NetworkInterface>,
    port_result: PortCheckResult,
    dns_result: DnsLookupResult,
    port_calls: Mutex<Vec<(String, u16, u64)>>,
    dns_calls: Mutex<Vec<String>>,
    pub fail: bool,
}

impl MockNetwork {
    pub fn new() -> Self {
        Self {
            interfaces: sample_interfaces(),
            port_result: sample_port_result(),
            dns_result: sample_dns_result(),
            port_calls: Mutex::new(Vec::new()),
            dns_calls: Mutex::new(Vec::new()),
            fail: false,
        }
    }

    pub fn port_calls(&self) -> Vec<(String, u16, u64)> {
        self.port_calls.lock().expect("mock lock").clone()
    }

    pub fn dns_calls(&self) -> Vec<String> {
        self.dns_calls.lock().expect("mock lock").clone()
    }
}

impl Default for MockNetwork {
    fn default() -> Self {
        Self::new()
    }
}

impl NetworkProbe for MockNetwork {
    fn interfaces(&self) -> OpsResult<Vec<NetworkInterface>> {
        if self.fail {
            return Err(OpsError::Platform("mock interface failure".into()));
        }
        Ok(self.interfaces.clone())
    }

    fn check_port(&self, host: &str, port: u16, timeout_ms: u64) -> OpsResult<PortCheckResult> {
        self.port_calls
            .lock()
            .expect("mock lock")
            .push((host.to_string(), port, timeout_ms));
        Ok(self.port_result.clone())
    }

    fn resolve(&self, host: &str) -> OpsResult<DnsLookupResult> {
        self.dns_calls
            .lock()
            .expect("mock lock")
            .push(host.to_string());
        Ok(self.dns_result.clone())
    }
}

#[derive(Default)]
pub struct MockElevation {
    elevated: AtomicBool,
    relaunched: AtomicBool,
}

impl MockElevation {
    pub fn new(elevated: bool) -> Self {
        Self {
            elevated: AtomicBool::new(elevated),
            relaunched: AtomicBool::new(false),
        }
    }

    pub fn relaunched(&self) -> bool {
        self.relaunched.load(Ordering::SeqCst)
    }
}

impl Elevation for MockElevation {
    fn is_elevated(&self) -> bool {
        self.elevated.load(Ordering::SeqCst)
    }

    fn relaunch_elevated(&self) -> OpsResult<()> {
        if self.is_elevated() {
            return Err(OpsError::InvalidInput(
                "青衫工具箱已以管理员身份运行".into(),
            ));
        }
        self.relaunched.store(true, Ordering::SeqCst);
        Ok(())
    }
}

/// Bundle of mock adapters for tests that want the full capability set.
pub struct MockAdapters {
    pub system: Arc<MockSystem>,
    pub processes: Arc<MockProcesses>,
    pub services: Arc<MockServices>,
    pub network: Arc<MockNetwork>,
    pub elevation: Arc<MockElevation>,
}

impl MockAdapters {
    pub fn new() -> Self {
        Self {
            system: Arc::new(MockSystem::new()),
            processes: Arc::new(MockProcesses::new()),
            services: Arc::new(MockServices::new()),
            network: Arc::new(MockNetwork::new()),
            elevation: Arc::new(MockElevation::new(false)),
        }
    }
}

impl Default for MockAdapters {
    fn default() -> Self {
        Self::new()
    }
}
