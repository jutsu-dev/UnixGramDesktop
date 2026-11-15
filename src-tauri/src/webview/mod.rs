//! JavaScript injected into UnixGram pages. Nothing here is loaded by the
//! local settings window.

use serde_json::json;

use crate::{
    preferences::ClientPreferences,
    theme::{site_theme, theme_css},
};

/// Initialization script of every account window: unread counter and reconnect notice.
pub(crate) const DESKTOP_RUNTIME: &str = include_str!("desktop-runtime.js");

/// Evaluated in account and market windows when the connection comes back.
pub(crate) const RECOVERY_SCRIPT: &str = include_str!("recovery.js");

/// Builds the script that applies theme CSS and runtime options to an account page.
pub(crate) fn preferences_script(preferences: &ClientPreferences) -> String {
    let css = serde_json::to_string(&theme_css(preferences)).unwrap_or_else(|_| "\"\"".to_string());
    let runtime_options = json!({"reconnectEnabled": preferences.reconnect_enabled, "trayUnreadBadge": preferences.tray_unread_badge, "windowsNotifications": preferences.windows_notifications});
    let site_theme = site_theme(&preferences.theme);
    format!(
        r#"
            (() => {{
              if (window.top !== window || !['https://unixgram.com','https://www.unixgram.com'].includes(location.origin)) return;
              window.__ugdRuntime?.configure({runtime_options});
              const root = document.documentElement;
              window.__ugdThemeObserver?.disconnect();
              if ('{site_theme}' === 'native') {{
                if (Object.hasOwn(window, '__ugdOriginalTheme')) {{
                  if (window.__ugdOriginalTheme === null) root.removeAttribute('data-theme');
                  else root.setAttribute('data-theme', window.__ugdOriginalTheme);
                  delete window.__ugdOriginalTheme;
                }}
              }} else {{
                if (!Object.hasOwn(window, '__ugdOriginalTheme')) window.__ugdOriginalTheme = root.getAttribute('data-theme');
                const keepTheme = () => {{ if (root.getAttribute('data-theme') !== '{site_theme}') root.setAttribute('data-theme', '{site_theme}'); }};
                keepTheme();
                window.__ugdThemeObserver = new MutationObserver(keepTheme);
                window.__ugdThemeObserver.observe(root, {{ attributes: true, attributeFilter: ['data-theme'] }});
              }}
              const updatePage = () => {{ root.dataset.ugdPage = location.pathname.includes('/messages') ? 'messages' : 'default'; }};
              updatePage();
              if (window.__unixgramDesktopPageTimer) clearInterval(window.__unixgramDesktopPageTimer);
              window.__unixgramDesktopPageTimer = setInterval(updatePage, 500);
              let style = document.getElementById('unixgram-desktop-preferences');
              if (!style) {{ style = document.createElement('style'); style.id = 'unixgram-desktop-preferences'; document.head.appendChild(style); }}
              style.textContent = {css};

              const refreshExpiredQr = () => {{
                if (document.hidden || location.pathname.startsWith('/dashboard')) return;
                const now = Date.now();
                if (now - (window.__unixgramDesktopLastQrRefresh || 0) < 10_000) return;
                const trigger = [...document.querySelectorAll('button')].find((button) => {{
                  const text = (button.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
                  const visible = button.getClientRects().length > 0 && !button.disabled;
                  const expired = text.includes('qr-код истёк') && text.includes('обновить');
                  const expiredEnglish = text.includes('qr code expired') && text.includes('refresh');
                  return visible && (expired || expiredEnglish);
                }});
                if (trigger) {{
                  window.__unixgramDesktopLastQrRefresh = now;
                  trigger.click();
                }}
              }};
              refreshExpiredQr();
              if (window.__unixgramDesktopQrObserver) window.__unixgramDesktopQrObserver.disconnect();
              let qrPending = false;
              window.__unixgramDesktopQrObserver = new MutationObserver(() => {{
                if (qrPending) return;
                qrPending = true;
                setTimeout(() => {{ qrPending = false; refreshExpiredQr(); }}, 250);
              }});
              window.__unixgramDesktopQrObserver.observe(document.body, {{ childList: true, subtree: true, characterData: true }});
            }})()
        "#
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn remote_window_automatically_refreshes_only_the_expired_qr_control() {
        let script = preferences_script(&ClientPreferences::default());
        assert!(script.contains("text.includes('qr-код истёк')"));
        assert!(script.contains("text.includes('обновить')"));
        assert!(script.contains("window.__unixgramDesktopLastQrRefresh"));
        assert!(script.contains("< 10_000"));
    }

    #[test]
    fn preferences_script_carries_runtime_options_theme_and_escaped_css() {
        let script = preferences_script(&ClientPreferences {
            theme: "light".to_string(),
            reconnect_enabled: false,
            ..ClientPreferences::default()
        });
        assert!(script.contains(
            r#"configure({"reconnectEnabled":false,"trayUnreadBadge":true,"windowsNotifications":true});"#
        ));
        assert!(script.contains("root.setAttribute('data-theme', 'light')"));
        // The CSS travels as a JSON string literal, never as raw script text.
        assert!(script.contains(r#"style.textContent = "html{--ugd-bg:#f1f2f5;"#));
        assert!(script.contains("['https://unixgram.com','https://www.unixgram.com']"));

        let native = preferences_script(&ClientPreferences::default());
        assert!(native.contains("if ('native' === 'native')"));
    }

    #[test]
    fn injected_scripts_only_run_on_unixgram_and_cooperate_on_recovery() {
        assert!(DESKTOP_RUNTIME.contains(
            "!['https://unixgram.com', 'https://www.unixgram.com'].includes(location.origin)"
        ));
        assert!(DESKTOP_RUNTIME.contains("window.__ugdRuntime = {"));
        assert!(DESKTOP_RUNTIME.contains("recover()"));
        assert!(
            RECOVERY_SCRIPT
                .contains("if (window.__ugdRuntime) { window.__ugdRuntime.recover(); return; }")
        );
        assert!(RECOVERY_SCRIPT.contains("const hasDraft"));
        assert!(RECOVERY_SCRIPT.contains("unixgram-desktop-recovery-notice"));
    }
}
