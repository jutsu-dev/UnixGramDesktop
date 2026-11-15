//! Navigation policy: which URLs may load inside the application's windows,
//! how external links are confirmed and what happens to popups.

use std::time::{Duration, Instant};

use tauri::{AppHandle, Manager, Url, plugin::TauriPlugin};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons};

use crate::{
    accounts::{account_window_label, is_account_window, is_market_window, source_account_id},
    config::{UNIXGRAM_HOST, UNIXGRAM_WWW_HOST, UNIXPLACE_HOST},
    discord::update_active_section,
    state::AppState,
    windows::show_market_url,
};

/// Where a URL is allowed to go.
#[derive(Debug, PartialEq, Eq)]
pub(crate) enum Destination {
    /// unixgram.com: stays in the account window.
    Unixgram,
    /// place.unixgram.com: opens in the market window of the same account.
    Unixplace,
    /// Any other HTTPS site: system browser, after confirmation.
    External,
    /// Not HTTPS on port 443, carries credentials, or is too long: dropped.
    Blocked,
}

pub(crate) fn destination(url: &Url) -> Destination {
    if url.scheme() != "https"
        || url.host_str().is_none()
        || !url.username().is_empty()
        || url.password().is_some()
        || url.port_or_known_default() != Some(443)
        || url.as_str().len() > 8192
    {
        return Destination::Blocked;
    }
    match url.host_str() {
        Some(UNIXGRAM_HOST | UNIXGRAM_WWW_HOST) => Destination::Unixgram,
        Some(UNIXPLACE_HOST) => Destination::Unixplace,
        _ => Destination::External,
    }
}

// Shared across account windows: never queue website-generated prompts.
#[derive(Default)]
pub(crate) struct PromptGate {
    pending: bool,
    completed_at: Option<Instant>,
}

impl PromptGate {
    pub(crate) fn begin(&mut self, now: Instant) -> bool {
        if self.pending
            || self
                .completed_at
                .is_some_and(|last| now.duration_since(last) < Duration::from_secs(15))
        {
            return false;
        }
        self.pending = true;
        true
    }

    pub(crate) fn complete(&mut self, now: Instant) {
        self.pending = false;
        self.completed_at = Some(now);
    }
}

pub(crate) fn validate_unixgram_url(url: &str) -> Result<Url, String> {
    let parsed = Url::parse(url).map_err(|_| "некорректная ссылка".to_string())?;
    if !matches!(
        destination(&parsed),
        Destination::Unixgram | Destination::Unixplace
    ) {
        return Err("клиент открывает только защищённые ссылки UnixGram и UnixPlace".to_string());
    }
    Ok(parsed)
}

pub(crate) fn is_unixplace_url(url: &Url) -> bool {
    destination(url) == Destination::Unixplace
}

/// Asks before handing an external link to the system browser. At most one
/// prompt is open at a time, followed by a 15 second cooldown.
fn confirm_browser_link(app: &AppHandle, label: &str, url: &Url) {
    if destination(url) != Destination::External {
        return;
    }
    let Some(window) = app.get_webview_window(label) else {
        return;
    };
    // Background pages cannot interrupt the active application with dialogs.
    if !window.is_focused().unwrap_or(false) {
        return;
    }
    let state = app.state::<AppState>();
    if !state
        .external_link_prompt
        .lock()
        .is_ok_and(|mut gate| gate.begin(Instant::now()))
    {
        return;
    }
    let target = url.clone();
    let callback_app = app.clone();
    // Display origin only: bot links can carry private start/payment parameters.
    app.dialog()
        .message(format!(
            "Открыть ссылку на {} в системном браузере?\n\nСайт откроется вне UnixGram Desktop.",
            url.origin().ascii_serialization()
        ))
        .title("Внешняя ссылка · UnixGram Desktop")
        .parent(&window)
        .buttons(MessageDialogButtons::OkCancelCustom(
            "Открыть в браузере".into(),
            "Отмена".into(),
        ))
        .show(move |confirmed| {
            if confirmed && open::that_detached(target.as_str()).is_err() {
                callback_app
                    .dialog()
                    .message("Не удалось открыть браузер. Повторите попытку позже.")
                    .title("UnixGram Desktop")
                    .show(|_| {});
            }
            if let Ok(mut gate) = callback_app.state::<AppState>().external_link_prompt.lock() {
                gate.complete(Instant::now());
            }
        });
}

/// Popups are never opened as new windows; the caller always denies them.
pub(crate) fn handle_popup(app: &AppHandle, label: &str, url: Url) {
    match destination(&url) {
        Destination::Unixgram | Destination::Unixplace => {
            // Reuse the source account's webview; the navigation policy still applies.
            if let Some(window) = app.get_webview_window(label) {
                let _ = window.navigate(url);
            }
        }
        Destination::External => confirm_browser_link(app, label, &url),
        Destination::Blocked => {}
    }
}

/// The plugin that enforces the policy for every navigation in every webview.
pub(crate) fn plugin() -> TauriPlugin<tauri::Wry> {
    tauri::plugin::Builder::<tauri::Wry, ()>::new("unixgram-navigation")
        .on_navigation(|webview, url| {
            if is_account_window(webview.label()) && is_unixplace_url(url) {
                show_market_url(
                    webview.app_handle(),
                    source_account_id(webview.label()),
                    url,
                );
                return false;
            }
            if is_account_window(webview.label()) && validate_unixgram_url(url.as_str()).is_err() {
                confirm_browser_link(webview.app_handle(), webview.label(), url);
                return false;
            }
            if is_market_window(webview.label()) && !is_unixplace_url(url) {
                if destination(url) == Destination::Unixgram {
                    if let Some(window) =
                        webview
                            .app_handle()
                            .get_webview_window(&account_window_label(source_account_id(
                                webview.label(),
                            )))
                    {
                        let _ = window.navigate(url.clone());
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                    return false;
                }
                confirm_browser_link(webview.app_handle(), webview.label(), url);
                return false;
            }
            if is_account_window(webview.label()) || is_market_window(webview.label()) {
                update_active_section(webview.app_handle(), url);
            }
            true
        })
        .build()
}

#[cfg(test)]
mod tests {
    use super::*;

    // Bot and payment links must leave the application; lookalike hosts,
    // credentials, other ports and non-HTTPS schemes are never loaded.
    #[test]
    fn destinations_keep_external_sites_outside_native_windows() {
        for (url, expected) in [
            ("https://unixgram.com/dashboard/bots", Destination::Unixgram),
            ("https://www.unixgram.com:443/", Destination::Unixgram),
            (
                "https://place.unixgram.com/auction/123",
                Destination::Unixplace,
            ),
            ("https://example.com/?start=bot", Destination::External),
            ("https://unixgram.com.example.com/", Destination::External),
            ("https://user@unixgram.com/", Destination::Blocked),
            ("https://user:pass@example.com/", Destination::Blocked),
            ("https://unixgram.com:444/", Destination::Blocked),
            ("https://place.unixgram.com:444/", Destination::Blocked),
            ("http://unixgram.com/", Destination::Blocked),
            ("javascript:alert(1)", Destination::Blocked),
            ("data:text/html,test", Destination::Blocked),
            ("file:///C:/test.txt", Destination::Blocked),
            ("tg://resolve?domain=example", Destination::Blocked),
        ] {
            assert_eq!(destination(&Url::parse(url).unwrap()), expected, "{url}");
        }
    }

    // Duplicate popup attempts neither queue dialogs nor bypass the cooldown.
    #[test]
    fn prompts_are_single_flight_and_cool_down_after_completion() {
        let now = Instant::now();
        let mut gate = PromptGate::default();
        assert!(gate.begin(now));
        assert!(!gate.begin(now + Duration::from_secs(60)));
        gate.complete(now + Duration::from_secs(60));
        assert!(!gate.begin(now + Duration::from_secs(74)));
        assert!(gate.begin(now + Duration::from_secs(75)));
    }

    #[test]
    fn accepts_exact_https_unixgram_hosts() {
        for url in [
            "https://unixgram.com/dashboard/messages",
            "https://www.unixgram.com/",
            "https://place.unixgram.com/",
        ] {
            let parsed = validate_unixgram_url(url).expect("trusted UnixGram URL must be accepted");
            assert_eq!(parsed.scheme(), "https");
        }
    }

    #[test]
    fn every_built_in_url_passes_the_navigation_policy() {
        use crate::config::{
            BASE_URL, CREATOR_PROFILE_URL, DASHBOARD_URL, HEALTH_URL, LOGIN_URL, MARKET_URL,
            MESSAGES_URL, TRUSTED_HOSTS,
        };

        for url in [
            BASE_URL,
            CREATOR_PROFILE_URL,
            DASHBOARD_URL,
            HEALTH_URL,
            LOGIN_URL,
            MESSAGES_URL,
        ] {
            let parsed = Url::parse(url).unwrap();
            assert_eq!(destination(&parsed), Destination::Unixgram, "{url}");
        }
        assert!(is_unixplace_url(&Url::parse(MARKET_URL).unwrap()));
        for host in TRUSTED_HOSTS {
            assert!(validate_unixgram_url(&format!("https://{host}/")).is_ok());
        }
    }

    #[test]
    fn routes_only_the_real_unixplace_host_to_its_own_window() {
        assert!(is_unixplace_url(
            &Url::parse("https://place.unixgram.com/auctions").unwrap()
        ));
        assert!(!is_unixplace_url(
            &Url::parse("https://unixgram.com/dashboard").unwrap()
        ));
        assert!(!is_unixplace_url(
            &Url::parse("https://place.unixgram.com.evil.example/").unwrap()
        ));
        assert!(!is_unixplace_url(
            &Url::parse("http://place.unixgram.com/").unwrap()
        ));
    }

    #[test]
    fn rejects_insecure_or_lookalike_hosts() {
        assert!(validate_unixgram_url("http://unixgram.com/dashboard").is_err());
        assert!(validate_unixgram_url("http://place.unixgram.com/").is_err());
        assert!(validate_unixgram_url("https://unixgram.com.evil.example/dashboard").is_err());
        assert!(validate_unixgram_url("https://place.unixgram.com.evil.example/").is_err());
        assert!(validate_unixgram_url("not a url").is_err());
    }
}
