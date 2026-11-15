//! The settings window: the only window that loads the bundled local page
//! and the only one allowed to call IPC commands.

use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

use super::initial_window_size;
use crate::{config::SETTINGS_WINDOW_LABEL, discord::update_active_section_label};

/// Entry page of the bundled frontend, which renders the settings UI.
pub(crate) const SETTINGS_PAGE: &str = "index.html";

pub(crate) fn show_settings_window(app: &AppHandle) {
    update_active_section_label(app, "Настройки");
    if let Some(window) = app.get_webview_window(SETTINGS_WINDOW_LABEL) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
        return;
    }
    let (width, height) = initial_window_size(app, (760.0, 720.0));
    let _ = WebviewWindowBuilder::new(
        app,
        SETTINGS_WINDOW_LABEL,
        WebviewUrl::App(SETTINGS_PAGE.into()),
    )
    .title("Настройки UnixGram Desktop")
    .inner_size(width, height)
    .min_inner_size(width.min(360.0), height.min(320.0))
    .center()
    .build();
}
