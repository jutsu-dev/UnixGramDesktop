//! Discord Rich Presence and the public section label it may display.

use std::{thread, time::Duration};

use discord_rich_presence::{DiscordIpc, DiscordIpcClient, activity};
use tauri::{AppHandle, Manager, Url};

use crate::{
    config::{BASE_URL, DISCORD_CLIENT_ID, UNIXPLACE_HOST},
    preferences::load_preferences,
    state::AppState,
};

/// Section reported before any page has been classified.
pub(crate) const DEFAULT_SECTION: &str = "UnixGram";

fn validate_discord_client_id(client_id: &str) -> Result<&str, String> {
    let trimmed = client_id.trim();
    if !(17..=24).contains(&trimmed.len())
        || !trimmed.chars().all(|character| character.is_ascii_digit())
    {
        return Err("укажите корректный Discord Application ID".to_string());
    }
    Ok(trimmed)
}

fn discord_activity_details(section: &str, show_section: bool) -> String {
    if !show_section {
        return "в приложении".to_string();
    }
    let clean = section
        .trim()
        .chars()
        .filter(|character| !character.is_control())
        .take(96)
        .collect::<String>();
    if clean.is_empty() {
        "в приложении".to_string()
    } else {
        format!("раздел: {clean}")
    }
}

fn discord_activity_payload(details: &str) -> activity::Activity<'_> {
    activity::Activity::new()
        .state("UnixGram Desktop")
        .details(details)
        .assets(
            activity::Assets::new()
                .large_image("unixgram")
                .large_text("UnixGram Desktop"),
        )
        .buttons(vec![activity::Button::new("Открыть UnixGram", BASE_URL)])
}

fn connect_discord_client(client_id: &str) -> Result<DiscordIpcClient, String> {
    let mut client = DiscordIpcClient::new(client_id);
    client
        .connect()
        .map_err(|_| "Discord не запущен или RPC недоступен".to_string())?;
    Ok(client)
}

fn set_discord_activity(client: &mut DiscordIpcClient, details: &str) -> Result<(), String> {
    if client
        .set_activity(discord_activity_payload(details))
        .is_ok()
    {
        return Ok(());
    }

    client
        .reconnect()
        .map_err(|_| "Discord RPC недоступен; переподключение не удалось".to_string())?;
    client
        .set_activity(discord_activity_payload(details))
        .map_err(|_| "Discord отклонил Rich Presence после переподключения".to_string())
}

/// Connects, updates or clears the activity. The application id is always
/// the built-in one; callers cannot point the client at another application.
pub(crate) fn update_discord_presence(
    state: &AppState,
    enabled: bool,
    section: &str,
    show_section: bool,
) -> Result<String, String> {
    let mut active = state
        .discord
        .lock()
        .map_err(|_| "Discord state lock failed".to_string())?;
    if !enabled {
        if let Some(mut client) = active.take() {
            let _ = client.clear_activity();
            let _ = client.close();
        }
        return Ok("выключено".to_string());
    }
    let client_id = validate_discord_client_id(DISCORD_CLIENT_ID)?;
    if active
        .as_ref()
        .is_none_or(|client| client.client_id != client_id)
    {
        if let Some(mut old) = active.take() {
            let _ = old.close();
        }
        *active = Some(connect_discord_client(client_id)?);
    }
    let details = discord_activity_details(section, show_section);
    let result = active
        .as_mut()
        .ok_or_else(|| "Discord RPC не подключён".to_string())
        .and_then(|client| set_discord_activity(client, &details));
    if let Err(error) = result {
        if let Some(mut stale) = active.take() {
            let _ = stale.close();
        }
        return Err(error);
    }
    Ok("активно".to_string())
}

fn section_from_url(url: &Url) -> &'static str {
    if url.host_str() == Some(UNIXPLACE_HOST) {
        return "UnixPlace";
    }
    let path = url.path();
    let route = |base: &str| {
        path == base
            || path
                .strip_prefix(base)
                .is_some_and(|tail| tail.starts_with('/'))
    };
    if route("/u") || route("/dashboard/profile") {
        "Профиль"
    } else if route("/dashboard/bots") {
        "Боты"
    } else if route("/dashboard/messages") {
        "Сообщения"
    } else if route("/dashboard/notifications") {
        "Уведомления"
    } else if route("/communities") || route("/dashboard/communities") {
        "Сообщества"
    } else if route("/dashboard/studio") || route("/dashboard/analytics") {
        "Студия"
    } else if route("/dashboard/gifts") {
        "Подарки"
    } else if route("/dashboard/search") || route("/dashboard/explore") {
        "Поиск"
    } else if route("/dashboard/stars") {
        "Звёзды"
    } else {
        "Лента"
    }
}

pub(crate) fn update_active_section(app: &AppHandle, url: &Url) {
    update_active_section_label(app, section_from_url(url));
}

pub(crate) fn update_active_section_label(app: &AppHandle, section: &str) {
    let state = app.state::<AppState>();
    let section = section
        .trim()
        .chars()
        .filter(|character| !character.is_control())
        .take(64)
        .collect::<String>();
    let section = if section.is_empty() {
        DEFAULT_SECTION.to_string()
    } else {
        section
    };
    if let Ok(mut active) = state.active_section.lock() {
        *active = section.clone();
    }
    let preferences = load_preferences(app);
    let _ = update_discord_presence(
        &state,
        preferences.discord_presence,
        &section,
        preferences.discord_show_section,
    );
}

/// Refreshes the activity every 15 seconds so Discord restarts are picked up.
pub(crate) fn start_presence_loop(app: AppHandle) {
    thread::spawn(move || {
        loop {
            let preferences = load_preferences(&app);
            let state = app.state::<AppState>();
            let section = state
                .active_section
                .lock()
                .ok()
                .map(|section| section.clone())
                .unwrap_or_else(|| DEFAULT_SECTION.to_string());
            let _ = update_discord_presence(
                &state,
                preferences.discord_presence,
                &section,
                preferences.discord_show_section,
            );
            thread::sleep(Duration::from_secs(15));
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_discord_application_ids() {
        assert_eq!(
            validate_discord_client_id("1540399183276539904").unwrap(),
            "1540399183276539904"
        );
        assert!(validate_discord_client_id(" 1540399183276539904 ").is_ok());
        assert!(validate_discord_client_id("discord-app").is_err());
        assert!(validate_discord_client_id("12345").is_err());
        assert_eq!(
            validate_discord_client_id(DISCORD_CLIENT_ID).unwrap(),
            DISCORD_CLIENT_ID
        );
    }

    #[test]
    fn formats_discord_details_safely() {
        assert_eq!(discord_activity_details("Лента", true), "раздел: Лента");
        assert_eq!(discord_activity_details(" \n\t ", true), "в приложении");
        assert_eq!(discord_activity_details("ignored", false), "в приложении");
        assert!(
            discord_activity_details(&"a".repeat(120), true)
                .chars()
                .count()
                <= 104
        );
    }

    #[test]
    fn discord_activity_uses_the_published_unixgram_asset() {
        let payload = serde_json::to_value(discord_activity_payload("в приложении"))
            .expect("Discord activity must serialize");
        assert_eq!(payload["assets"]["large_image"], "unixgram");
        assert_eq!(payload["assets"]["large_text"], "UnixGram Desktop");
    }

    #[test]
    fn discord_sections_are_public_labels_only() {
        let cases = [
            ("https://unixgram.com/dashboard", "Лента"),
            (
                "https://unixgram.com/dashboard/messages/secret",
                "Сообщения",
            ),
            (
                "https://unixgram.com/dashboard/notifications",
                "Уведомления",
            ),
            ("https://unixgram.com/dashboard/gifts", "Подарки"),
            // Route boundaries: the label never includes a bot name or query.
            ("https://unixgram.com/dashboard/bots", "Боты"),
            (
                "https://unixgram.com/dashboard/bots/example?start=private",
                "Боты",
            ),
            ("https://unixgram.com/dashboard/botshop", "Лента"),
            ("https://unixgram.com/u/dashboard/bots", "Профиль"),
            ("https://unixgram.com/u/messages", "Профиль"),
            ("https://unixgram.com/dashboard/explore", "Поиск"),
            ("https://unixgram.com/dashboard/analytics", "Студия"),
            ("https://unixgram.com/dashboard/stars", "Звёзды"),
            ("https://unixgram.com/dashboard/messages-other", "Лента"),
            ("https://place.unixgram.com/auction/123", "UnixPlace"),
        ];
        for (url, expected) in cases {
            assert_eq!(section_from_url(&Url::parse(url).unwrap()), expected);
        }
    }
}
