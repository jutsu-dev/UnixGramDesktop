//! The IPC surface. Commands stay thin and delegate to the feature modules.
//!
//! Every command here is also declared in build.rs and granted in
//! capabilities/settings.json, so only the local settings window may call it.

use std::sync::atomic::Ordering;

use tauri::{AppHandle, State};

use crate::{
    accounts,
    config::CREATOR_PROFILE_URL,
    discord::update_discord_presence,
    navigation::validate_unixgram_url,
    preferences::{ClientPreferences, load_preferences, normalize_preferences, write_preferences},
    shortcuts::sync_global_shortcuts,
    state::{AppState, SecurityStatus},
    windows::{apply_preferences, navigate_active_account},
};

#[tauri::command]
pub(crate) fn desktop_preferences(app: AppHandle) -> ClientPreferences {
    load_preferences(&app)
}

#[tauri::command]
pub(crate) fn desktop_save_preferences(
    app: AppHandle,
    preferences: ClientPreferences,
) -> Result<ClientPreferences, String> {
    // Account membership is changed only by the account commands, never by a stale settings form.
    let current = load_preferences(&app);
    let mut preferences = normalize_preferences(preferences);
    preferences.accounts = current.accounts;
    preferences.active_account = current.active_account;
    write_preferences(&app, &preferences)?;
    apply_preferences(&app, &preferences);
    sync_global_shortcuts(&app, preferences.global_hotkeys);
    Ok(preferences)
}

#[tauri::command]
pub(crate) async fn desktop_add_account(
    app: AppHandle,
    label: String,
) -> Result<ClientPreferences, String> {
    accounts::add_account(&app, label).await
}

#[tauri::command]
pub(crate) fn desktop_switch_account(app: AppHandle, id: u8) -> Result<ClientPreferences, String> {
    accounts::switch_account(&app, id)
}

#[tauri::command]
pub(crate) async fn desktop_remove_account(
    app: AppHandle,
    id: u8,
) -> Result<ClientPreferences, String> {
    accounts::remove_account(&app, id).await
}

#[tauri::command]
pub(crate) fn desktop_open_creator_profile(app: AppHandle) -> Result<(), String> {
    validate_unixgram_url(CREATOR_PROFILE_URL)?;
    navigate_active_account(&app, CREATOR_PROFILE_URL);
    Ok(())
}

/// Windows settings page for a media device, or `None` for an unknown device.
fn media_settings_uri(device: &str) -> Option<&'static str> {
    match device {
        "microphone" => Some("ms-settings:privacy-microphone"),
        "camera" => Some("ms-settings:privacy-webcam"),
        "sound" => Some("ms-settings:sound"),
        _ => None,
    }
}

#[tauri::command]
pub(crate) fn desktop_media_settings(device: String) -> Result<(), String> {
    let target = media_settings_uri(&device).ok_or_else(|| "неизвестное устройство".to_string())?;
    open::that_detached(target).map_err(|_| "не удалось открыть настройки Windows".to_string())
}

#[tauri::command]
pub(crate) fn desktop_security_status(
    app: AppHandle,
    state: State<'_, AppState>,
) -> SecurityStatus {
    let preferences = load_preferences(&app);
    let hotkeys = state
        .hotkeys
        .lock()
        .ok()
        .map(|status| status.clone())
        .unwrap_or_default();
    SecurityStatus::snapshot(
        preferences.accounts.len(),
        hotkeys,
        state.online.load(Ordering::Relaxed),
    )
}

#[tauri::command]
pub(crate) fn discord_presence(
    state: State<'_, AppState>,
    enabled: bool,
    section: String,
    show_section: bool,
) -> Result<String, String> {
    update_discord_presence(&state, enabled, &section, show_section)
}

#[cfg(test)]
#[path = "commands_tests.rs"]
mod tests;
