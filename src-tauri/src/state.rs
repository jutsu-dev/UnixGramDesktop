//! Runtime state managed by Tauri and the status snapshots derived from it.

use std::{
    collections::HashMap,
    sync::{
        Mutex,
        atomic::{AtomicBool, AtomicU32},
    },
    time::Instant,
};

use discord_rich_presence::DiscordIpcClient;
use serde::Serialize;

use crate::{
    config::{MAX_ACCOUNTS, TRUSTED_HOSTS},
    discord::DEFAULT_SECTION,
    navigation::PromptGate,
};

pub(crate) struct AppState {
    pub(crate) external_link_prompt: Mutex<PromptGate>,
    pub(crate) discord: Mutex<Option<DiscordIpcClient>>,
    pub(crate) unread_by_window: Mutex<HashMap<String, u32>>,
    pub(crate) pending_titles: Mutex<HashMap<String, (Instant, String)>>,
    pub(crate) active_section: Mutex<String>,
    pub(crate) hotkeys: Mutex<HotkeyRuntimeStatus>,
    pub(crate) online: AtomicBool,
    pub(crate) consecutive_network_failures: AtomicU32,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            external_link_prompt: Mutex::new(PromptGate::default()),
            discord: Mutex::new(None),
            unread_by_window: Mutex::new(HashMap::new()),
            pending_titles: Mutex::new(HashMap::new()),
            active_section: Mutex::new(DEFAULT_SECTION.to_string()),
            hotkeys: Mutex::new(HotkeyRuntimeStatus::default()),
            online: AtomicBool::new(true),
            consecutive_network_failures: AtomicU32::new(0),
        }
    }
}

/// Result of the last global shortcut registration pass.
#[derive(Clone, Default)]
pub(crate) struct HotkeyRuntimeStatus {
    pub(crate) enabled: bool,
    pub(crate) registered: usize,
    pub(crate) expected: usize,
    pub(crate) unavailable: Vec<String>,
}

/// Read-only summary shown in the security section of the settings window.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SecurityStatus {
    https_only: bool,
    trusted_hosts: Vec<&'static str>,
    session_storage: &'static str,
    isolated_accounts: usize,
    max_accounts: usize,
    online: bool,
    notifications_private: bool,
    discord_private: bool,
    global_hotkeys: bool,
    registered_hotkeys: usize,
    expected_hotkeys: usize,
    unavailable_hotkeys: Vec<String>,
    version: &'static str,
}

impl SecurityStatus {
    pub(crate) fn snapshot(
        isolated_accounts: usize,
        hotkeys: HotkeyRuntimeStatus,
        online: bool,
    ) -> Self {
        Self {
            https_only: true,
            trusted_hosts: TRUSTED_HOSTS.to_vec(),
            // Sessions live only in the WebView2 profiles; nothing is written to
            // Windows Credential Manager.
            session_storage: "изолированные профили WebView2",
            isolated_accounts,
            max_accounts: usize::from(MAX_ACCOUNTS),
            online,
            notifications_private: true,
            discord_private: true,
            global_hotkeys: hotkeys.enabled && hotkeys.registered > 0,
            registered_hotkeys: hotkeys.registered,
            expected_hotkeys: hotkeys.expected,
            unavailable_hotkeys: hotkeys.unavailable,
            version: env!("CARGO_PKG_VERSION"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn security_status_reports_webview_profiles_and_registered_hotkeys() {
        let status = SecurityStatus::snapshot(
            2,
            HotkeyRuntimeStatus {
                enabled: true,
                registered: 7,
                expected: 8,
                unavailable: vec!["Ctrl+Alt+S".to_string()],
            },
            false,
        );
        let encoded = serde_json::to_value(status).unwrap();
        assert_eq!(encoded["sessionStorage"], "изолированные профили WebView2");
        assert_eq!(encoded["httpsOnly"], true);
        assert_eq!(
            encoded["trustedHosts"],
            serde_json::json!(["unixgram.com", "www.unixgram.com", "place.unixgram.com"])
        );
        assert_eq!(encoded["isolatedAccounts"], 2);
        assert_eq!(encoded["maxAccounts"], 3);
        assert_eq!(encoded["online"], false);
        assert_eq!(encoded["globalHotkeys"], true);
        assert_eq!(encoded["registeredHotkeys"], 7);
        assert_eq!(encoded["expectedHotkeys"], 8);
        assert_eq!(
            encoded["unavailableHotkeys"],
            serde_json::json!(["Ctrl+Alt+S"])
        );
        assert_eq!(encoded["version"], env!("CARGO_PKG_VERSION"));

        let disabled = SecurityStatus::snapshot(1, HotkeyRuntimeStatus::default(), true);
        assert!(!disabled.global_hotkeys);
    }
}
