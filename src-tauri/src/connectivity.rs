//! Health monitor: tracks whether UnixGram is reachable and offers recovery
//! to open pages when the connection returns.

use std::{sync::atomic::Ordering, time::Duration};

use serde_json::Value;
use tauri::{AppHandle, Manager};
use tauri_plugin_notification::NotificationExt;

use crate::{
    accounts::{account_window_label, market_window_label},
    config::{HEALTH_URL, MAX_ACCOUNTS, USER_AGENT},
    discord::update_active_section,
    preferences::load_preferences,
    state::AppState,
    tray::refresh_tray_status,
    webview::RECOVERY_SCRIPT,
};

/// The health endpoint must answer with a JSON object whose "ok" is true.
fn is_healthy(payload: &Value) -> bool {
    payload.get("ok") == Some(&Value::Bool(true))
}

/// Seconds until the next probe: 15 while online, otherwise an exponential
/// backoff of 10, 20 and then 40 seconds.
fn next_probe_delay(online: bool, failures: u32) -> u64 {
    if online {
        15
    } else {
        (5_u64.saturating_mul(2_u64.saturating_pow(failures.min(3)))).min(60)
    }
}

pub(crate) fn start_connection_monitor(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(6))
            .user_agent(USER_AGENT)
            .build();
        let Ok(client) = client else { return };
        loop {
            let online = match client.get(HEALTH_URL).send().await {
                Ok(response) if response.status().is_success() => response
                    .json::<Value>()
                    .await
                    .is_ok_and(|payload| is_healthy(&payload)),
                _ => false,
            };
            let state = app.state::<AppState>();
            let was_online = state.online.swap(online, Ordering::Relaxed);
            let failures = if online {
                state
                    .consecutive_network_failures
                    .swap(0, Ordering::Relaxed);
                0
            } else {
                state
                    .consecutive_network_failures
                    .fetch_add(1, Ordering::Relaxed)
                    .saturating_add(1)
            };
            let total = state
                .unread_by_window
                .lock()
                .ok()
                .map(|counts| counts.values().copied().sum::<u32>())
                .unwrap_or(0);
            refresh_tray_status(&app, total);
            let preferences = load_preferences(&app);
            if let Some(window) =
                app.get_webview_window(&account_window_label(preferences.active_account))
                && let Ok(url) = window.url()
            {
                update_active_section(&app, &url);
            }
            if !was_online && online && preferences.reconnect_enabled {
                for id in 1..=MAX_ACCOUNTS {
                    if let Some(window) = app.get_webview_window(&account_window_label(id)) {
                        let _ = window.eval(RECOVERY_SCRIPT);
                    }
                    if let Some(window) = app.get_webview_window(&market_window_label(id)) {
                        let _ = window.eval(RECOVERY_SCRIPT);
                    }
                }
                if preferences.windows_notifications {
                    let _ = app
                        .notification()
                        .builder()
                        .title("UnixGram Desktop")
                        .body("соединение восстановлено")
                        .show();
                }
            }
            let wait = next_probe_delay(online, failures);
            tokio::time::sleep(Duration::from_secs(wait)).await;
        }
    });
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    #[test]
    fn probe_delay_is_steady_online_and_backs_off_offline() {
        assert_eq!(next_probe_delay(true, 0), 15);
        assert_eq!(next_probe_delay(true, 9), 15);
        assert_eq!(next_probe_delay(false, 1), 10);
        assert_eq!(next_probe_delay(false, 2), 20);
        assert_eq!(next_probe_delay(false, 3), 40);
        assert_eq!(next_probe_delay(false, 4), 40);
        assert_eq!(next_probe_delay(false, u32::MAX), 40);
    }

    #[test]
    fn only_an_explicit_ok_true_counts_as_healthy() {
        assert!(is_healthy(&json!({"ok": true})));
        assert!(is_healthy(&json!({"ok": true, "uptime": 12})));
        assert!(!is_healthy(&json!({"ok": false})));
        assert!(!is_healthy(&json!({"ok": "true"})));
        assert!(!is_healthy(&json!({"status": "ok"})));
        assert!(!is_healthy(&json!([true])));
    }
}
