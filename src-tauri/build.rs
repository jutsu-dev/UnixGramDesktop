//! Build script: declares the application's IPC commands to Tauri's ACL.

/// Every command registered with `invoke_handler` in src/lib.rs.
///
/// Declaring the commands in an application manifest makes Tauri generate an
/// `allow-<command>` and a `deny-<command>` permission for each of them and
/// switches application commands from "callable by any local page" to "denied
/// unless a capability grants them". capabilities/settings.json grants them
/// to the local settings window only.
const COMMANDS: &[&str] = &[
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

fn main() {
    tauri_build::try_build(
        tauri_build::Attributes::new()
            .app_manifest(tauri_build::AppManifest::new().commands(COMMANDS)),
    )
    .expect("failed to run tauri-build");
}
