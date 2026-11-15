//! The persisted client preferences: model, normalisation and atomic storage.

use std::{fs, path::PathBuf};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use crate::{
    config::{MAX_ACCOUNTS, PRIMARY_ACCOUNT_ID},
    theme::{DEFAULT_THEME, is_known_theme},
};

#[derive(Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AccountProfile {
    pub(crate) id: u8,
    pub(crate) label: String,
}

impl AccountProfile {
    /// The primary account always exists and cannot be removed.
    pub(crate) fn primary() -> Self {
        Self {
            id: PRIMARY_ACCOUNT_ID,
            label: "Основной".to_string(),
        }
    }
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(default)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ClientPreferences {
    pub(crate) theme: String,
    pub(crate) liquid_glass: bool,
    pub(crate) glass_strength: f64,
    pub(crate) glass_mode: String,
    pub(crate) reduce_transparency: bool,
    pub(crate) compact_chats: bool,
    pub(crate) large_chat_text: bool,
    pub(crate) reduce_motion: bool,
    pub(crate) smooth_scroll: bool,
    pub(crate) underline_links: bool,
    pub(crate) fullscreen: bool,
    pub(crate) always_on_top: bool,
    pub(crate) zoom: f64,
    pub(crate) discord_presence: bool,
    pub(crate) discord_show_section: bool,
    pub(crate) tray_unread_badge: bool,
    pub(crate) windows_notifications: bool,
    pub(crate) reconnect_enabled: bool,
    pub(crate) global_hotkeys: bool,
    pub(crate) active_account: u8,
    pub(crate) accounts: Vec<AccountProfile>,
}

impl Default for ClientPreferences {
    fn default() -> Self {
        Self {
            theme: DEFAULT_THEME.to_string(),
            liquid_glass: false,
            glass_strength: 0.72,
            glass_mode: "frosted".to_string(),
            reduce_transparency: false,
            compact_chats: false,
            large_chat_text: false,
            reduce_motion: false,
            smooth_scroll: false,
            underline_links: false,
            fullscreen: false,
            always_on_top: false,
            zoom: 1.0,
            discord_presence: true,
            discord_show_section: false,
            tray_unread_badge: true,
            windows_notifications: true,
            reconnect_enabled: true,
            global_hotkeys: true,
            active_account: PRIMARY_ACCOUNT_ID,
            accounts: vec![AccountProfile::primary()],
        }
    }
}

fn preferences_path(app: &AppHandle) -> Result<PathBuf, String> {
    let directory = app
        .path()
        .app_config_dir()
        .map_err(|_| "не удалось открыть папку настроек".to_string())?;
    fs::create_dir_all(&directory).map_err(|_| "не удалось создать папку настроек".to_string())?;
    Ok(directory.join("client-preferences.json"))
}

pub(crate) fn load_preferences(app: &AppHandle) -> ClientPreferences {
    let preferences = preferences_path(app)
        .ok()
        .and_then(|path| fs::read_to_string(path).ok())
        .and_then(|contents| serde_json::from_str(&contents).ok())
        .unwrap_or_default();
    normalize_preferences(preferences)
}

/// Label stored for an account: trimmed, free of control characters and at
/// most 32 characters long. An empty label falls back to the slot number.
pub(crate) fn clean_account_label(id: u8, label: &str) -> String {
    let clean = label
        .trim()
        .chars()
        .filter(|character| !character.is_control())
        .take(32)
        .collect::<String>();
    if clean.is_empty() {
        format!("Аккаунт {id}")
    } else {
        clean
    }
}

pub(crate) fn normalize_preferences(mut preferences: ClientPreferences) -> ClientPreferences {
    if !is_known_theme(&preferences.theme) {
        preferences.theme = DEFAULT_THEME.to_string();
    }
    preferences.zoom = preferences.zoom.clamp(0.8, 1.4);
    preferences.glass_strength = preferences.glass_strength.clamp(0.58, 0.90);
    if !["frosted", "clear"].contains(&preferences.glass_mode.as_str()) {
        preferences.glass_mode = "frosted".to_string();
    }
    preferences
        .accounts
        .retain(|account| (1..=MAX_ACCOUNTS).contains(&account.id));
    preferences.accounts.sort_by_key(|account| account.id);
    preferences.accounts.dedup_by_key(|account| account.id);
    preferences.accounts.truncate(usize::from(MAX_ACCOUNTS));
    if !preferences
        .accounts
        .iter()
        .any(|account| account.id == PRIMARY_ACCOUNT_ID)
    {
        preferences.accounts.insert(0, AccountProfile::primary());
    }
    for account in &mut preferences.accounts {
        account.label = clean_account_label(account.id, &account.label);
    }
    if !preferences
        .accounts
        .iter()
        .any(|account| account.id == preferences.active_account)
    {
        preferences.active_account = PRIMARY_ACCOUNT_ID;
    }
    preferences
}

/// Writes to a temporary file first so a crash never leaves a truncated file.
pub(crate) fn write_preferences(
    app: &AppHandle,
    preferences: &ClientPreferences,
) -> Result<(), String> {
    let serialized = serde_json::to_string_pretty(preferences)
        .map_err(|_| "не удалось сохранить настройки".to_string())?;
    let path = preferences_path(app)?;
    let temporary = path.with_extension("json.tmp");
    fs::write(&temporary, serialized).map_err(|_| "не удалось сохранить настройки".to_string())?;
    fs::rename(&temporary, &path).map_err(|_| "не удалось применить настройки".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    // Saved choices survive while Rich Presence stays enabled by default for new users.
    #[test]
    fn new_preferences_enable_presence_without_overriding_saved_opt_out() {
        let fresh: ClientPreferences = serde_json::from_str("{}").unwrap();
        assert!(fresh.discord_presence);
        assert!(!fresh.discord_show_section);
        assert!(!fresh.smooth_scroll);
        assert!(!fresh.underline_links);
        let saved: ClientPreferences = serde_json::from_str(
            r#"{"discordPresence":false,"smoothScroll":true,"underlineLinks":true}"#,
        )
        .unwrap();
        let restored = normalize_preferences(saved);
        assert!(!restored.discord_presence);
        assert!(restored.smooth_scroll);
        assert!(restored.underline_links);
        let encoded = serde_json::to_value(restored).unwrap();
        assert_eq!(encoded["discordPresence"], false);
        assert_eq!(encoded["smoothScroll"], true);
        assert_eq!(encoded["underlineLinks"], true);
    }

    #[test]
    fn account_preferences_are_limited_sanitized_and_keep_primary() {
        let preferences = ClientPreferences {
            theme: "unknown".to_string(),
            active_account: 3,
            accounts: vec![
                AccountProfile {
                    id: 2,
                    label: "  рынок\n".to_string(),
                },
                AccountProfile {
                    id: 2,
                    label: "duplicate".to_string(),
                },
                AccountProfile {
                    id: 4,
                    label: "invalid".to_string(),
                },
            ],
            ..ClientPreferences::default()
        };
        let normalized = normalize_preferences(preferences);
        assert_eq!(normalized.theme, "native");
        assert_eq!(normalized.active_account, 1);
        assert_eq!(normalized.accounts.len(), 2);
        assert_eq!(normalized.accounts[0].id, 1);
        assert_eq!(normalized.accounts[1].label, "рынок");
    }

    #[test]
    fn account_labels_are_trimmed_bounded_and_never_empty() {
        assert_eq!(clean_account_label(2, "  Работа\t"), "Работа");
        assert_eq!(clean_account_label(2, " \n "), "Аккаунт 2");
        assert_eq!(clean_account_label(3, &"я".repeat(40)).chars().count(), 32);
        assert_eq!(AccountProfile::primary().id, 1);
        assert_eq!(ClientPreferences::default().accounts.len(), 1);
    }

    #[test]
    fn out_of_range_numbers_are_clamped() {
        let normalized = normalize_preferences(ClientPreferences {
            zoom: 9.0,
            glass_strength: 0.1,
            glass_mode: "mirror".to_string(),
            ..ClientPreferences::default()
        });
        assert_eq!(normalized.zoom, 1.4);
        assert_eq!(normalized.glass_strength, 0.58);
        assert_eq!(normalized.glass_mode, "frosted");
    }
}
