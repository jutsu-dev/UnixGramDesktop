// Kept in a sibling file on purpose: these tests inspect lib.rs, build.rs and
// the capability file as text, and must not be satisfied by their own text.

use serde_json::Value;

use super::media_settings_uri;
use crate::config::SETTINGS_WINDOW_LABEL;

/// The complete IPC contract. A command exists only if it is registered in
/// lib.rs, declared in build.rs and granted in capabilities/settings.json.
const COMMANDS: [&str; 9] = [
    "desktop_preferences",
    "desktop_save_preferences",
    "desktop_add_account",
    "desktop_switch_account",
    "desktop_remove_account",
    "desktop_open_creator_profile",
    "desktop_media_settings",
    "desktop_security_status",
    "discord_presence",
];

fn capability() -> Value {
    serde_json::from_str(include_str!("../capabilities/settings.json"))
        .expect("capabilities/settings.json must be valid JSON")
}

#[test]
fn invoke_handler_registers_exactly_the_ipc_contract() {
    let lib = include_str!("lib.rs");
    let handler = lib
        .split_once("tauri::generate_handler![")
        .and_then(|(_, rest)| rest.split_once(']'))
        .map(|(list, _)| list)
        .expect("lib.rs must register commands with generate_handler!");
    let registered = handler
        .split(',')
        .map(str::trim)
        .filter(|entry| !entry.is_empty())
        .collect::<Vec<_>>();
    let expected = COMMANDS
        .iter()
        .map(|command| format!("commands::{command}"))
        .collect::<Vec<_>>();
    assert_eq!(registered, expected);
}

#[test]
fn build_script_declares_exactly_the_ipc_contract() {
    let build = include_str!("../build.rs");
    let declared = build
        .split_once("const COMMANDS: &[&str] = &[")
        .and_then(|(_, rest)| rest.split_once("];"))
        .map(|(list, _)| list)
        .expect("build.rs must declare the command list");
    let declared = declared
        .split(',')
        .map(|entry| entry.trim().trim_matches('"'))
        .filter(|entry| !entry.is_empty())
        .collect::<Vec<_>>();
    assert_eq!(declared, COMMANDS);
}

#[test]
fn only_the_local_settings_window_is_granted_the_commands() {
    let capability = capability();
    assert_eq!(capability["identifier"], "settings-window");
    assert_eq!(
        capability["windows"],
        serde_json::json!([SETTINGS_WINDOW_LABEL])
    );
    // No remote origin and no additional webview may ever be listed here.
    assert!(capability.get("remote").is_none());
    assert!(capability.get("webviews").is_none());
    assert_ne!(capability["local"], Value::Bool(false));

    let permissions = capability["permissions"]
        .as_array()
        .expect("permissions must be a list")
        .iter()
        .map(|permission| permission.as_str().expect("permissions must be plain ids"))
        .collect::<Vec<_>>();
    let mut expected = vec!["core:default".to_string()];
    expected.extend(
        COMMANDS
            .iter()
            .map(|command| format!("allow-{}", command.replace('_', "-"))),
    );
    assert_eq!(permissions, expected);
}

#[test]
fn media_settings_open_only_known_windows_pages() {
    assert_eq!(
        media_settings_uri("microphone"),
        Some("ms-settings:privacy-microphone")
    );
    assert_eq!(
        media_settings_uri("camera"),
        Some("ms-settings:privacy-webcam")
    );
    assert_eq!(media_settings_uri("sound"), Some("ms-settings:sound"));
    assert_eq!(media_settings_uri("ms-settings:sound"), None);
    assert_eq!(media_settings_uri("https://example.com"), None);
    assert_eq!(media_settings_uri(""), None);
}
