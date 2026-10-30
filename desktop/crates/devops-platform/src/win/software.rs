use std::collections::HashSet;

use devops_core::{InstalledApp, OpsResult, SoftwareInventory, SoftwareScope};
use windows::Win32::System::Registry::{HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE};

use super::registry;

const UNINSTALL: &str = r"Software\Microsoft\Windows\CurrentVersion\Uninstall";

#[derive(Default)]
pub struct SoftwareInventoryImpl;

impl SoftwareInventory for SoftwareInventoryImpl {
    fn list(&self) -> OpsResult<Vec<InstalledApp>> {
        let mut apps = Vec::new();
        let mut seen = HashSet::new();

        for (root, scope) in [
            (HKEY_LOCAL_MACHINE, SoftwareScope::Machine),
            (HKEY_CURRENT_USER, SoftwareScope::User),
        ] {
            for view in [64u32, 32u32] {
                let Ok(parent) = registry::open_view(root, UNINSTALL, view, false) else {
                    continue;
                };
                let keys = match registry::enum_subkeys(parent) {
                    Ok(keys) => keys,
                    Err(_) => {
                        registry::close(parent);
                        continue;
                    }
                };
                for key_name in keys {
                    let path = format!(r"{UNINSTALL}\{key_name}");
                    let Ok(key) = registry::open_view(root, &path, view, false) else {
                        continue;
                    };
                    if let Some(app) = read_app(key, &key_name, scope, view) {
                        let identity = format!(
                            "{}|{}|{}",
                            app.name.to_lowercase(),
                            app.version,
                            app.publisher.to_lowercase()
                        );
                        if seen.insert(identity) {
                            apps.push(app);
                        }
                    }
                    registry::close(key);
                }
                registry::close(parent);
            }
        }

        apps.sort_by_key(|app| app.name.to_lowercase());
        Ok(apps)
    }
}

fn read_app(
    key: windows::Win32::System::Registry::HKEY,
    key_name: &str,
    scope: SoftwareScope,
    view: u32,
) -> Option<InstalledApp> {
    let name = registry::read_string(key, "DisplayName")
        .ok()
        .flatten()?
        .trim()
        .to_string();
    if name.is_empty() {
        return None;
    }
    if registry::read_string(key, "SystemComponent")
        .ok()
        .flatten()
        .as_deref()
        == Some("1")
    {
        return None;
    }
    if registry::read_string(key, "ParentKeyName")
        .ok()
        .flatten()
        .is_some()
    {
        return None;
    }

    let text = |name: &str| {
        registry::read_string(key, name)
            .ok()
            .flatten()
            .unwrap_or_default()
            .trim()
            .to_string()
    };

    let scope_label = match scope {
        SoftwareScope::Machine => "machine",
        SoftwareScope::User => "user",
    };

    Some(InstalledApp {
        id: format!("{scope_label}:{view}:{key_name}"),
        name,
        version: text("DisplayVersion"),
        publisher: text("Publisher"),
        install_date: text("InstallDate"),
        install_location: text("InstallLocation"),
        uninstall_string: text("UninstallString"),
        scope,
        registry_view: format!("{view}-bit"),
        icon: crate::win::icons::icon_data_url(&text("DisplayIcon")),
    })
}

#[cfg(test)]
mod tests {
    #[test]
    fn uninstall_path_is_stable() {
        assert!(super::UNINSTALL.contains("Uninstall"));
    }
}
