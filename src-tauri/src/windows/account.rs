//! Account windows: one remote UnixGram webview per account slot.

use std::fs;

use tauri::{AppHandle, Manager, Url, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use tauri_plugin_notification::NotificationExt;

use super::{apply_preferences_to_window, initial_window_size};
use crate::{
    accounts::{account_profile_directory, account_window_label},
    config::{DASHBOARD_URL, MAX_ACCOUNTS, PRIMARY_ACCOUNT_ID, USER_AGENT},
    discord::update_active_section,
    navigation::handle_popup,
    preferences::{AccountProfile, load_preferences},
    tray::queue_unread_for_window,
    webview::DESKTOP_RUNTIME,
};

/// Returns the window of the account, creating it on first use. Secondary
/// accounts get their own WebView2 data directory.
pub(crate) fn create_account_window(
    app: &AppHandle,
    account: &AccountProfile,
    visible: bool,
) -> Result<WebviewWindow, String> {
    let label = account_window_label(account.id);
    if let Some(window) = app.get_webview_window(&label) {
        return Ok(window);
    }
    let (width, height) = initial_window_size(app, (1520.0, 960.0));
    let callback_label = label.clone();
    let popup_label = label.clone();
    let popup_app = app.clone();
    let mut builder = WebviewWindowBuilder::new(
        app,
        &label,
        WebviewUrl::External(Url::parse(DASHBOARD_URL).expect("trusted UnixGram URL")),
    )
    .title(format!("UnixGram Desktop · {}", account.label))
    .inner_size(width, height)
    .min_inner_size(width.min(360.0), height.min(320.0))
    .resizable(true)
    .center()
    .visible(visible)
    .user_agent(USER_AGENT)
    .disable_drag_drop_handler()
    .initialization_script(DESKTOP_RUNTIME)
    .on_download(|webview, event| {
        if let tauri::webview::DownloadEvent::Finished { success, .. } = event
            && load_preferences(webview.app_handle()).windows_notifications
        {
            let _ = webview
                .app_handle()
                .notification()
                .builder()
                .title("UnixGram Desktop")
                .body(if success {
                    "Файл скачан."
                } else {
                    "Не удалось скачать файл. Повторите загрузку на странице."
                })
                .show();
        }
        true
    })
    .on_new_window(move |url, _| {
        handle_popup(&popup_app, &popup_label, url);
        tauri::webview::NewWindowResponse::Deny
    })
    .on_document_title_changed(move |window, title| {
        queue_unread_for_window(window.app_handle(), &callback_label, &title);
        if window.is_focused().unwrap_or(false)
            && let Ok(url) = window.url()
        {
            update_active_section(window.app_handle(), &url);
        }
    });
    if account.id > PRIMARY_ACCOUNT_ID {
        let directory = account_profile_directory(app, account.id)?;
        fs::create_dir_all(&directory)
            .map_err(|_| "не удалось создать изолированный профиль".to_string())?;
        builder = builder.data_directory(directory);
    }
    let window = builder
        .build()
        .map_err(|_| "не удалось открыть окно аккаунта".to_string())?;
    apply_preferences_to_window(&window, &load_preferences(app));
    Ok(window)
}

pub(crate) fn hide_account_windows(app: &AppHandle) {
    for id in 1..=MAX_ACCOUNTS {
        if let Some(window) = app.get_webview_window(&account_window_label(id)) {
            let _ = window.hide();
        }
    }
}

/// Shows the window of the active account and hides the other accounts.
pub(crate) fn show_active_account(app: &AppHandle) {
    let preferences = load_preferences(app);
    let account = preferences
        .accounts
        .iter()
        .find(|account| account.id == preferences.active_account)
        .or_else(|| preferences.accounts.first());
    let Some(account) = account else { return };
    hide_account_windows(app);
    if let Ok(window) = create_account_window(app, account, true) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
        if let Ok(url) = window.url() {
            update_active_section(app, &url);
        }
    }
}

/// Navigates the active account window to one of the built-in UnixGram URLs.
pub(crate) fn navigate_active_account(app: &AppHandle, url: &str) {
    let preferences = load_preferences(app);
    let label = account_window_label(preferences.active_account);
    if app.get_webview_window(&label).is_none()
        && let Some(account) = preferences
            .accounts
            .iter()
            .find(|account| account.id == preferences.active_account)
    {
        let _ = create_account_window(app, account, true);
    }
    if let Some(window) = app.get_webview_window(&label) {
        let _ = window.navigate(Url::parse(url).expect("trusted UnixGram URL"));
        hide_account_windows(app);
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}
