//! UnixPlace market windows. Each one shares the WebView2 profile of its account.

use std::fs;

use tauri::{AppHandle, Manager, Url, WebviewUrl, WebviewWindowBuilder};

use super::initial_window_size;
use crate::{
    accounts::{account_profile_directory, active_account_id, market_window_label},
    config::{MARKET_URL, PRIMARY_ACCOUNT_ID, USER_AGENT},
    discord::update_active_section,
    navigation::{handle_popup, is_unixplace_url},
};

/// Shows the market window of the active account, creating it on first use.
pub(crate) fn show_market_window(app: &AppHandle) {
    let account_id = active_account_id(app);
    let label = market_window_label(account_id);
    if let Some(window) = app.get_webview_window(&label) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
        return;
    }
    let url = Url::parse(MARKET_URL).expect("trusted UnixPlace URL");
    show_market_url(app, account_id, &url);
}

/// Opens a UnixPlace URL in the market window of the given account. Any other
/// URL is ignored.
pub(crate) fn show_market_url(app: &AppHandle, account_id: u8, url: &Url) {
    if !is_unixplace_url(url) {
        return;
    }
    let label = market_window_label(account_id);
    if let Some(window) = app.get_webview_window(&label) {
        let _ = window.navigate(url.clone());
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
        return;
    }

    let popup_app = app.clone();
    let popup_label = label.clone();
    let (width, height) = initial_window_size(app, (1320.0, 860.0));
    let mut builder = WebviewWindowBuilder::new(app, &label, WebviewUrl::External(url.clone()))
        .title("UnixPlace")
        .inner_size(width, height)
        .min_inner_size(width.min(360.0), height.min(320.0))
        .center()
        .user_agent(USER_AGENT)
        .on_new_window(move |url, _| {
            handle_popup(&popup_app, &popup_label, url);
            tauri::webview::NewWindowResponse::Deny
        });
    if account_id > PRIMARY_ACCOUNT_ID
        && let Ok(directory) = account_profile_directory(app, account_id)
    {
        let _ = fs::create_dir_all(&directory);
        builder = builder.data_directory(directory);
    }
    if let Ok(window) = builder.build() {
        update_active_section(app, url);
        let _ = window.set_focus();
    }
}
