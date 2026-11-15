//! Compile-time constants shared by the whole shell.

// Hosts whose pages may be displayed inside the application's own windows.
pub(crate) const UNIXGRAM_HOST: &str = "unixgram.com";
pub(crate) const UNIXGRAM_WWW_HOST: &str = "www.unixgram.com";
pub(crate) const UNIXPLACE_HOST: &str = "place.unixgram.com";
pub(crate) const TRUSTED_HOSTS: [&str; 3] = [UNIXGRAM_HOST, UNIXGRAM_WWW_HOST, UNIXPLACE_HOST];

pub(crate) const BASE_URL: &str = "https://unixgram.com";
pub(crate) const DASHBOARD_URL: &str = "https://unixgram.com/dashboard";
pub(crate) const MESSAGES_URL: &str = "https://unixgram.com/dashboard/messages";
pub(crate) const LOGIN_URL: &str = "https://unixgram.com/auth/login";
pub(crate) const HEALTH_URL: &str = "https://unixgram.com/api/health";
pub(crate) const MARKET_URL: &str = "https://place.unixgram.com/";
pub(crate) const CREATOR_PROFILE_URL: &str = "https://unixgram.com/u/basaltes";

/// Application registered for Rich Presence. The settings page cannot override it.
pub(crate) const DISCORD_CLIENT_ID: &str = "1540399183276539904";

/// Browser-compatible identity used by every webview and by the health probe.
pub(crate) const USER_AGENT: &str = concat!(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0 UnixGramHistory/",
    env!("CARGO_PKG_VERSION")
);

/// The primary account always exists and uses the default WebView2 profile.
pub(crate) const PRIMARY_ACCOUNT_ID: u8 = 1;
/// Account slots are numbered from 1 to this value.
pub(crate) const MAX_ACCOUNTS: u8 = 3;

/// Label of the only local window. It must match capabilities/settings.json,
/// which grants the IPC commands to this window alone.
pub(crate) const SETTINGS_WINDOW_LABEL: &str = "settings";

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn built_in_identifiers_keep_their_published_values() {
        assert_eq!(CREATOR_PROFILE_URL, "https://unixgram.com/u/basaltes");
        assert_eq!(
            TRUSTED_HOSTS,
            ["unixgram.com", "www.unixgram.com", "place.unixgram.com"]
        );
        assert_eq!((PRIMARY_ACCOUNT_ID, MAX_ACCOUNTS), (1, 3));
        assert_eq!(SETTINGS_WINDOW_LABEL, "settings");
    }

    #[test]
    fn user_agent_keeps_a_browser_compatible_identity() {
        assert!(USER_AGENT.contains("Mozilla/5.0"));
        assert!(USER_AGENT.contains("AppleWebKit/537.36"));
        assert!(USER_AGENT.contains("Chrome/"));
        assert!(USER_AGENT.contains("Safari/537.36"));
        assert!(USER_AGENT.contains("Edg/"));
        assert!(USER_AGENT.contains(concat!("UnixGramHistory/", env!("CARGO_PKG_VERSION"))));
        assert!(!USER_AGENT.contains("UnixGramDesktop/0.1"));
    }
}
