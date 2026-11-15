//! Account slots: window labels, isolated WebView2 profiles and the
//! add / switch / remove operations behind the account commands.

use std::{
    fs,
    path::PathBuf,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use keyring::v1::Entry;
use tauri::{AppHandle, Manager, Url};

use crate::{
    config::{LOGIN_URL, MAX_ACCOUNTS, PRIMARY_ACCOUNT_ID},
    preferences::{
        AccountProfile, ClientPreferences, clean_account_label, load_preferences,
        normalize_preferences, write_preferences,
    },
    state::AppState,
    tray::refresh_tray_status,
    windows::{
        apply_preferences_to_window, create_account_window, hide_account_windows,
        show_active_account,
    },
};

/// Credential Manager entry under which versions that shipped the native
/// client (before the modular refactor) stored a session cookie per slot.
const LEGACY_SESSION_SERVICE: &str = "com.unixgram.desktop.community";
const LEGACY_SESSION_ACCOUNT_PREFIX: &str = "unixgram-session";

pub(crate) fn account_window_label(id: u8) -> String {
    if id == PRIMARY_ACCOUNT_ID {
        "main".to_string()
    } else {
        format!("account-{id}")
    }
}

pub(crate) fn market_window_label(id: u8) -> String {
    if id == PRIMARY_ACCOUNT_ID {
        "unixplace".to_string()
    } else {
        format!("unixplace-{id}")
    }
}

/// Account windows show unixgram.com and hide to the tray instead of closing.
pub(crate) fn is_account_window(label: &str) -> bool {
    label == "main" || label.starts_with("account-")
}

pub(crate) fn is_market_window(label: &str) -> bool {
    label.starts_with("unixplace")
}

/// Maps an account or market window label back to its account slot.
pub(crate) fn source_account_id(label: &str) -> u8 {
    label
        .strip_prefix("account-")
        .or_else(|| label.strip_prefix("unixplace-"))
        .and_then(|id| id.parse::<u8>().ok())
        .filter(|id| (1..=MAX_ACCOUNTS).contains(id))
        .unwrap_or(PRIMARY_ACCOUNT_ID)
}

pub(crate) fn active_account_id(app: &AppHandle) -> u8 {
    load_preferences(app)
        .active_account
        .clamp(PRIMARY_ACCOUNT_ID, MAX_ACCOUNTS)
}

/// WebView2 data directory of a secondary account. The primary account uses
/// the default profile of the application.
pub(crate) fn account_profile_directory(app: &AppHandle, id: u8) -> Result<PathBuf, String> {
    let root = app
        .path()
        .app_data_dir()
        .map_err(|_| "не удалось открыть папку клиента".to_string())?;
    Ok(root.join("account-profiles").join(format!("account-{id}")))
}

fn available_account_id(accounts: &[AccountProfile]) -> Option<u8> {
    (1..=MAX_ACCOUNTS).find(|id| !accounts.iter().any(|account| account.id == *id))
}

async fn detach_account_profile_directory(
    app: &AppHandle,
    id: u8,
) -> Result<Option<PathBuf>, String> {
    let directory = account_profile_directory(app, id)?;
    if !directory.exists() {
        return Ok(None);
    }
    let root = directory
        .parent()
        .ok_or_else(|| "некорректная папка профиля".to_string())?;
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let detached = root.join(format!(".account-{id}-delete-{nonce}"));
    let mut last_error = None;
    for _ in 0..20 {
        match fs::rename(&directory, &detached) {
            Ok(()) => return Ok(Some(detached)),
            Err(_error) if !directory.exists() => return Ok(None),
            Err(error) => last_error = Some(error),
        }
        tokio::time::sleep(Duration::from_millis(150)).await;
    }
    Err(format!(
        "WebView2 ещё использует профиль; повторите удаление через несколько секунд{}",
        last_error
            .map(|error| format!(" ({})", error.kind()))
            .unwrap_or_default()
    ))
}

fn delete_detached_profile(directory: PathBuf) {
    std::thread::spawn(move || {
        for _ in 0..20 {
            if !directory.exists() || fs::remove_dir_all(&directory).is_ok() {
                return;
            }
            std::thread::sleep(Duration::from_millis(250));
        }
        eprintln!("не удалось очистить отсоединённый профиль WebView2");
    });
}

fn legacy_session_account(account_id: u8) -> String {
    format!("{LEGACY_SESSION_ACCOUNT_PREFIX}-{account_id}")
}

/// Deletes the session cookie that versions before the modular refactor kept
/// in Windows Credential Manager for this slot. Nothing writes there any more:
/// sessions live only in the WebView2 profiles. The cleanup runs whenever a
/// slot is prepared, reset or removed so an old secret never outlives it.
fn purge_legacy_keyring_session(account_id: u8) -> Result<(), String> {
    let entry = Entry::new(LEGACY_SESSION_SERVICE, &legacy_session_account(account_id))
        .map_err(|_| "Windows Credential Manager недоступен".to_string())?;
    match entry.delete_credential() {
        Ok(()) | Err(keyring::v1::Error::NoEntry) => Ok(()),
        Err(_) => Err("не удалось удалить сохранённую сессию".to_string()),
    }
}

async fn prepare_unused_account_slot(app: &AppHandle, id: u8) -> Result<(), String> {
    purge_legacy_keyring_session(id)?;
    if let Some(window) = app.get_webview_window(&account_window_label(id)) {
        let _ = window.clear_all_browsing_data();
        let _ = window.destroy();
    }
    if let Some(window) = app.get_webview_window(&market_window_label(id)) {
        let _ = window.clear_all_browsing_data();
        let _ = window.destroy();
    }
    if let Some(directory) = detach_account_profile_directory(app, id).await? {
        delete_detached_profile(directory);
    }
    Ok(())
}

/// Adds an account in the first free slot and makes it the active one.
pub(crate) async fn add_account(
    app: &AppHandle,
    label: String,
) -> Result<ClientPreferences, String> {
    let mut preferences = load_preferences(app);
    if preferences.accounts.len() >= usize::from(MAX_ACCOUNTS) {
        return Err("можно подключить не больше трёх аккаунтов".to_string());
    }
    let id = available_account_id(&preferences.accounts)
        .ok_or_else(|| "нет свободного профиля".to_string())?;
    prepare_unused_account_slot(app, id).await?;
    let account = AccountProfile {
        id,
        label: clean_account_label(id, &label),
    };
    preferences.accounts.push(account.clone());
    preferences.active_account = id;
    preferences = normalize_preferences(preferences);
    let window = create_account_window(app, &account, true)?;
    if let Err(error) = write_preferences(app, &preferences) {
        let _ = window.destroy();
        return Err(error);
    }
    hide_account_windows(app);
    apply_preferences_to_window(&window, &preferences);
    let _ = window.show();
    let _ = window.set_focus();
    Ok(preferences)
}

pub(crate) fn switch_account(app: &AppHandle, id: u8) -> Result<ClientPreferences, String> {
    let mut preferences = load_preferences(app);
    let account = preferences
        .accounts
        .iter()
        .find(|account| account.id == id)
        .cloned()
        .ok_or_else(|| "аккаунт не найден".to_string())?;
    preferences.active_account = id;
    write_preferences(app, &preferences)?;
    hide_account_windows(app);
    let window = create_account_window(app, &account, true)?;
    let _ = window.show();
    let _ = window.set_focus();
    Ok(preferences)
}

/// Removes a secondary account together with its profile. The primary account
/// cannot be removed: its session is reset and the login page is shown instead.
pub(crate) async fn remove_account(app: &AppHandle, id: u8) -> Result<ClientPreferences, String> {
    if let Ok(mut pending) = app.state::<AppState>().pending_titles.lock() {
        pending.remove(&account_window_label(id));
    }
    if let Ok(mut counts) = app.state::<AppState>().unread_by_window.lock() {
        counts.remove(&account_window_label(id));
        refresh_tray_status(app, counts.values().copied().sum::<u32>().min(999));
    }
    if id == PRIMARY_ACCOUNT_ID {
        purge_legacy_keyring_session(PRIMARY_ACCOUNT_ID)?;
        if let Some(market) = app.get_webview_window(&market_window_label(PRIMARY_ACCOUNT_ID)) {
            market
                .clear_all_browsing_data()
                .map_err(|_| "не удалось очистить сессию UnixPlace".to_string())?;
            let _ = market.destroy();
        }
        if let Some(window) = app.get_webview_window(&account_window_label(PRIMARY_ACCOUNT_ID)) {
            window.clear_all_browsing_data().map_err(|_| {
                "не удалось очистить локальную сессию основного аккаунта".to_string()
            })?;
            let _ = window.navigate(Url::parse(LOGIN_URL).expect("trusted UnixGram login URL"));
            let _ = window.show();
            let _ = window.set_focus();
        }
        let mut preferences = load_preferences(app);
        preferences.active_account = PRIMARY_ACCOUNT_ID;
        write_preferences(app, &preferences)?;
        return Ok(preferences);
    }
    let mut preferences = load_preferences(app);
    if !preferences.accounts.iter().any(|account| account.id == id) {
        return Err("аккаунт не найден".to_string());
    }
    purge_legacy_keyring_session(id)?;
    if let Some(window) = app.get_webview_window(&account_window_label(id)) {
        let _ = window.clear_all_browsing_data();
        let _ = window.destroy();
    }
    if let Some(window) = app.get_webview_window(&market_window_label(id)) {
        let _ = window.clear_all_browsing_data();
        let _ = window.destroy();
    }
    let detached = detach_account_profile_directory(app, id).await?;
    preferences.accounts.retain(|account| account.id != id);
    if preferences.active_account == id {
        preferences.active_account = preferences
            .accounts
            .first()
            .map(|account| account.id)
            .unwrap_or(PRIMARY_ACCOUNT_ID);
    }
    write_preferences(app, &preferences)?;
    if let Some(directory) = detached {
        delete_detached_profile(directory);
    }
    show_active_account(app);
    Ok(preferences)
}

#[cfg(test)]
#[path = "accounts_tests.rs"]
mod tests;
