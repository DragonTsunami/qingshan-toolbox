pub mod elevation;
pub mod network;
pub mod process;
pub mod service;
pub mod system;

pub struct WindowsPlatform {
    pub system: system::SystemProbeImpl,
    pub processes: process::ProcessControlImpl,
    pub services: service::ServiceControlImpl,
    pub network: network::NetworkProbeImpl,
    pub elevation: elevation::ElevationImpl,
}

impl WindowsPlatform {
    pub fn new() -> Self {
        Self {
            system: system::SystemProbeImpl::new(),
            processes: process::ProcessControlImpl::new(),
            services: service::ServiceControlImpl,
            network: network::NetworkProbeImpl,
            elevation: elevation::ElevationImpl,
        }
    }
}
