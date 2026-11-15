//! Window management: creation, sizing and visibility of account, market
//! and settings windows, and applying preferences to a window.

mod account;
mod market;
mod settings;

use tauri::{AppHandle, Manager, Webview, WebviewWindow, Window, WindowEvent};

pub(crate) use account::{
    create_account_window, hide_account_windows, navigate_active_account, show_active_account,
};
pub(crate) use market::{show_market_url, show_market_window};
pub(crate) use settings::show_settings_window;

use crate::{
    accounts::{account_window_label, is_account_window, is_market_window},
    preferences::{ClientPreferences, load_preferences},
    webview::preferences_script,
};

/// Shrinks the preferred logical size so the window fits the work area of the
/// monitor. `width` and `height` are physical pixels, `scale` is the DPI factor.
fn fitted_window_size(width: f64, height: f64, scale: f64, preferred: (f64, f64)) -> (f64, f64) {
    let scale = if scale.is_finite() && scale > 0.0 {
        scale
    } else {
        1.0
    };
    // Leave room for window decorations; taskbar is excluded by work_area.
    (
        preferred.0.min((width / scale - 32.0).max(1.0)),
        preferred.1.min((height / scale - 64.0).max(1.0)),
    )
}

fn initial_window_size(app: &AppHandle, preferred: (f64, f64)) -> (f64, f64) {
    app.primary_monitor()
        .ok()
        .flatten()
        .map(|monitor| {
            let area = monitor.work_area();
            fitted_window_size(
                area.size.width as f64,
                area.size.height as f64,
                monitor.scale_factor(),
                preferred,
            )
        })
        .unwrap_or((preferred.0.min(1000.0), preferred.1.min(640.0)))
}

/// Applies window-level preferences and injects the theme into the page.
pub(crate) fn apply_preferences_to_window(window: &WebviewWindow, preferences: &ClientPreferences) {
    let _ = window.set_fullscreen(preferences.fullscreen);
    let _ = window.set_always_on_top(preferences.always_on_top);
    let _ = window.set_zoom(preferences.zoom.clamp(0.8, 1.4));
    let _ = window.eval(preferences_script(preferences));
}

/// Applies preferences to every open account window.
pub(crate) fn apply_preferences(app: &AppHandle, preferences: &ClientPreferences) {
    for account in &preferences.accounts {
        if let Some(window) = app.get_webview_window(&account_window_label(account.id)) {
            apply_preferences_to_window(&window, preferences);
        }
    }
}

/// Re-applies preferences after every page load of an account window.
pub(crate) fn handle_page_load(webview: &Webview) {
    if is_account_window(webview.label()) {
        let preferences = load_preferences(webview.app_handle());
        if let Some(webview_window) = webview.app_handle().get_webview_window(webview.label()) {
            apply_preferences_to_window(&webview_window, &preferences);
        }
    }
}

/// Account windows hide to the tray instead of closing. Closing a market
/// window hides it and brings the active account back.
pub(crate) fn handle_window_event(window: &Window, event: &WindowEvent) {
    if is_account_window(window.label())
        && let WindowEvent::CloseRequested { api, .. } = event
    {
        api.prevent_close();
        let _ = window.hide();
    } else if is_market_window(window.label())
        && matches!(event, WindowEvent::CloseRequested { .. })
    {
        if let WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
            let _ = window.hide();
        }
        show_active_account(window.app_handle());
    }
}

#[cfg(test)]
#[path = "tests.rs"]
mod tests;
