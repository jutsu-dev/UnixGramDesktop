//! UnixGram Desktop: an unofficial community Windows shell around unixgram.com.
//!
//! The process opens the UnixGram site in WebView2 windows and adds a tray
//! icon, themes, several accounts, global hotkeys, Discord Rich Presence and
//! a strict navigation policy on top of it. The only local page is the
//! settings window, and it is the only window allowed to call IPC commands.
//!
//! This file only wires the modules together; behaviour lives in the modules.

mod accounts;
mod commands;
mod config;
mod connectivity;
mod discord;
mod navigation;
mod preferences;
mod shortcuts;
mod state;
mod theme;
mod tray;
mod webview;
mod windows;

use config::PRIMARY_ACCOUNT_ID;
use preferences::AccountProfile;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(state::AppState::default())
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            windows::show_active_account(app);
        }))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(navigation::plugin())
        .setup(|app| {
            let app = app.handle();
            let preferences = preferences::load_preferences(app);
            let primary = preferences
                .accounts
                .iter()
                .find(|account| account.id == PRIMARY_ACCOUNT_ID)
                .cloned()
                .unwrap_or_else(AccountProfile::primary);
            windows::create_account_window(
                app,
                &primary,
                preferences.active_account == PRIMARY_ACCOUNT_ID,
            )?;
            tray::build_tray(app)?;
            windows::apply_preferences(app, &preferences);
            shortcuts::sync_global_shortcuts(app, preferences.global_hotkeys);
            connectivity::start_connection_monitor(app.clone());
            if preferences.active_account != PRIMARY_ACCOUNT_ID {
                windows::show_active_account(app);
            }
            discord::start_presence_loop(app.clone());
            Ok(())
        })
        .on_page_load(|webview, _| windows::handle_page_load(webview))
        .on_window_event(windows::handle_window_event)
        // Keep this list in sync with build.rs and capabilities/settings.json.
        .invoke_handler(tauri::generate_handler![
            commands::desktop_preferences,
            commands::desktop_save_preferences,
            commands::desktop_add_account,
            commands::desktop_switch_account,
            commands::desktop_remove_account,
            commands::desktop_open_creator_profile,
            commands::desktop_media_settings,
            commands::desktop_security_status,
            commands::discord_presence,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}
