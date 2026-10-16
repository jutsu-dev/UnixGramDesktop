mod navigation;

use discord_rich_presence::{DiscordIpc, DiscordIpcClient, activity};
use keyring::v1::Entry;
use navigation::{Destination, PromptGate, destination};
use reqwest::{
    Client, Url,
    cookie::{CookieStore, Jar},
    redirect::Policy,
};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::{
    collections::HashMap,
    fs,
    sync::{
        Arc, Mutex,
        atomic::{AtomicBool, AtomicU32, Ordering},
    },
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::{
    Manager, WebviewUrl, WebviewWindowBuilder,
    image::Image,
    menu::MenuBuilder,
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use tauri_plugin_notification::NotificationExt;

const BASE_URL: &str = "https://unixgram.com";
const DESKTOP_RUNTIME: &str = include_str!("desktop-runtime.js");
const CREATOR_PROFILE_URL: &str = "https://unixgram.com/u/basaltes";
const DISCORD_CLIENT_ID: &str = "1540399183276539904";
const SESSION_SERVICE: &str = "com.unixgram.desktop.community";
const SESSION_ACCOUNT_PREFIX: &str = "unixgram-session";
const UNIXGRAM_HTTP_USER_AGENT: &str = concat!(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0 UnixGramHistory/",
    env!("CARGO_PKG_VERSION")
);
const RECOVERY_SCRIPT: &str = r#"(() => {
  if (window.__ugdRuntime) { window.__ugdRuntime.recover(); return; }
  const fields = document.querySelectorAll('input, textarea, [contenteditable="true"]');
  const hasDraft = Array.from(fields).some((field) => {
    const value = 'value' in field ? field.value : field.textContent;
    return typeof value === 'string' && value.trim().length > 0;
  });
  let notice = document.getElementById('unixgram-desktop-recovery-notice');
  if (!notice) {
    notice = document.createElement('div');
    notice.id = 'unixgram-desktop-recovery-notice';
    notice.setAttribute('role', 'status');
    Object.assign(notice.style, {
      position: 'fixed', left: '50%', bottom: '22px', transform: 'translateX(-50%)',
      zIndex: '2147483647', padding: '10px 14px', borderRadius: '12px',
      color: '#fff', background: 'rgba(20, 20, 24, .94)',
      font: '600 13px system-ui, sans-serif', boxShadow: '0 8px 28px rgba(0,0,0,.35)'
    });
    document.body.appendChild(notice);
  }
  notice.textContent = hasDraft ? 'Связь восстановлена. Текст остался в окне. Обновите страницу после отправки.' : 'Связь восстановлена. Если данные устарели, обновите страницу вручную.';
  clearTimeout(window.__unixgramRecoveryNoticeTimer);
  window.__unixgramRecoveryNoticeTimer = setTimeout(() => notice?.remove(), 6000);
})();"#;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BootInfo {
    channel: &'static str,
    protocol: &'static str,
    themes: usize,
    status: &'static str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SessionInfo {
    connected: bool,
    user_id: Option<String>,
    username: Option<String>,
    storage: &'static str,
    message: String,
    active_account: Option<u8>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AttachmentRequest {
    conversation_id: String,
    file_name: String,
    mime_type: String,
    bytes: Vec<u8>,
    content: String,
    reply_to_id: Option<String>,
    reply_quote: Option<String>,
    client_message_id: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreatePostImage {
    file_name: String,
    mime_type: String,
    bytes: Vec<u8>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreatePostRequest {
    content: String,
    images: Vec<CreatePostImage>,
    client_post_id: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct QrStart {
    approval_url: String,
    status: &'static str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SyncSnapshot {
    profile: Value,
    gifts: Value,
    feed: Value,
    warnings: Vec<String>,
    fetched_at_epoch: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopSections {
    messages: Value,
    notifications: Value,
    communities: Value,
    activity: Value,
    gift_collections: Value,
    warnings: Vec<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PasswordLogin {
    email: String,
    password: String,
    captcha_token: Option<String>,
    two_factor_code: Option<String>,
}

struct QrFlow {
    client: Client,
    jar: Arc<Jar>,
    token: String,
}

struct AppState {
    external_link_prompt: Mutex<PromptGate>,
    qr: Mutex<Option<QrFlow>>,
    discord: Mutex<Option<DiscordIpcClient>>,
    unread_by_window: Mutex<HashMap<String, u32>>,
    pending_titles: Mutex<HashMap<String, (std::time::Instant, String)>>,
    active_section: Mutex<String>,
    hotkeys: Mutex<HotkeyRuntimeStatus>,
    online: AtomicBool,
    consecutive_network_failures: AtomicU32,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            external_link_prompt: Mutex::new(PromptGate::default()),
            qr: Mutex::new(None),
            discord: Mutex::new(None),
            unread_by_window: Mutex::new(HashMap::new()),
            pending_titles: Mutex::new(HashMap::new()),
            active_section: Mutex::new("UnixGram".to_string()),
            hotkeys: Mutex::new(HotkeyRuntimeStatus::default()),
            online: AtomicBool::new(true),
            consecutive_network_failures: AtomicU32::new(0),
        }
    }
}

#[derive(Clone, Default)]
struct HotkeyRuntimeStatus {
    enabled: bool,
    registered: usize,
    expected: usize,
    unavailable: Vec<String>,
}

#[derive(Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
struct AccountProfile {
    id: u8,
    label: String,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(default)]
#[serde(rename_all = "camelCase")]
struct ClientPreferences {
    theme: String,
    liquid_glass: bool,
    glass_strength: f64,
    glass_mode: String,
    reduce_transparency: bool,
    compact_chats: bool,
    large_chat_text: bool,
    reduce_motion: bool,
    smooth_scroll: bool,
    underline_links: bool,
    fullscreen: bool,
    always_on_top: bool,
    zoom: f64,
    discord_presence: bool,
    discord_show_section: bool,
    tray_unread_badge: bool,
    windows_notifications: bool,
    reconnect_enabled: bool,
    global_hotkeys: bool,
    active_account: u8,
    accounts: Vec<AccountProfile>,
}

impl Default for ClientPreferences {
    fn default() -> Self {
        Self {
            theme: "native".to_string(),
            liquid_glass: false,
            glass_strength: 0.72,
            glass_mode: "frosted".to_string(),
            reduce_transparency: false,
            compact_chats: false,
            large_chat_text: false,
            reduce_motion: false,
            smooth_scroll: false,
            underline_links: false,
            fullscreen: false,
            always_on_top: false,
            zoom: 1.0,
            discord_presence: true,
            discord_show_section: false,
            tray_unread_badge: true,
            windows_notifications: true,
            reconnect_enabled: true,
            global_hotkeys: true,
            active_account: 1,
            accounts: vec![AccountProfile {
                id: 1,
                label: "Основной".to_string(),
            }],
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SecurityStatus {
    https_only: bool,
    trusted_hosts: Vec<&'static str>,
    session_storage: &'static str,
    isolated_accounts: usize,
    max_accounts: usize,
    online: bool,
    notifications_private: bool,
    discord_private: bool,
    global_hotkeys: bool,
    registered_hotkeys: usize,
    expected_hotkeys: usize,
    unavailable_hotkeys: Vec<String>,
    version: &'static str,
}

fn preferences_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let directory = app
        .path()
        .app_config_dir()
        .map_err(|_| "не удалось открыть папку настроек".to_string())?;
    fs::create_dir_all(&directory).map_err(|_| "не удалось создать папку настроек".to_string())?;
    Ok(directory.join("client-preferences.json"))
}

fn load_preferences(app: &tauri::AppHandle) -> ClientPreferences {
    let preferences = preferences_path(app)
        .ok()
        .and_then(|path| fs::read_to_string(path).ok())
        .and_then(|contents| serde_json::from_str(&contents).ok())
        .unwrap_or_default();
    normalize_preferences(preferences)
}

fn normalize_preferences(mut preferences: ClientPreferences) -> ClientPreferences {
    const THEMES: [&str; 12] = [
        "native", "midnight", "oled", "graphite", "aurora", "light", "lucifer", "basaltes",
        "honey", "ocean", "rose", "forest",
    ];
    if !THEMES.contains(&preferences.theme.as_str()) {
        preferences.theme = "native".to_string();
    }
    preferences.zoom = preferences.zoom.clamp(0.8, 1.4);
    preferences.glass_strength = preferences.glass_strength.clamp(0.58, 0.90);
    if !["frosted", "clear"].contains(&preferences.glass_mode.as_str()) {
        preferences.glass_mode = "frosted".to_string();
    }
    preferences
        .accounts
        .retain(|account| (1..=3).contains(&account.id));
    preferences.accounts.sort_by_key(|account| account.id);
    preferences.accounts.dedup_by_key(|account| account.id);
    preferences.accounts.truncate(3);
    if !preferences.accounts.iter().any(|account| account.id == 1) {
        preferences.accounts.insert(
            0,
            AccountProfile {
                id: 1,
                label: "Основной".to_string(),
            },
        );
    }
    for account in &mut preferences.accounts {
        let clean = account
            .label
            .trim()
            .chars()
            .filter(|character| !character.is_control())
            .take(32)
            .collect::<String>();
        account.label = if clean.is_empty() {
            format!("Аккаунт {}", account.id)
        } else {
            clean
        };
    }
    if !preferences
        .accounts
        .iter()
        .any(|account| account.id == preferences.active_account)
    {
        preferences.active_account = 1;
    }
    preferences
}

fn write_preferences(
    app: &tauri::AppHandle,
    preferences: &ClientPreferences,
) -> Result<(), String> {
    let serialized = serde_json::to_string_pretty(preferences)
        .map_err(|_| "не удалось сохранить настройки".to_string())?;
    let path = preferences_path(app)?;
    let temporary = path.with_extension("json.tmp");
    fs::write(&temporary, serialized).map_err(|_| "не удалось сохранить настройки".to_string())?;
    fs::rename(&temporary, &path).map_err(|_| "не удалось применить настройки".to_string())
}

fn theme_css(preferences: &ClientPreferences) -> String {
    let palette = match preferences.theme.as_str() {
        "midnight" => (
            "#0a0e1a", "#151d30", "#a097ff", "#edf0ff", "#35415b", "#101426",
        ),
        "oled" => (
            "#000000", "#0b0b0e", "#a397ff", "#ffffff", "#303037", "#100c23",
        ),
        "graphite" => (
            "#121416", "#202328", "#b3bdce", "#f4f5f7", "#414752", "#101113",
        ),
        "aurora" => (
            "#091612", "#142820", "#71dab5", "#effffb", "#355348", "#06120f",
        ),
        "light" => (
            "#f1f2f5", "#ffffff", "#5948c7", "#191b24", "#c5c8d2", "#ffffff",
        ),
        "lucifer" => (
            "#10080b", "#241018", "#e78a9d", "#fff1f3", "#58303d", "#270b13",
        ),
        "basaltes" => (
            "#08050e", "#191023", "#bb97ff", "#f7efff", "#49315f", "#180d29",
        ),
        "honey" => (
            "#15120b", "#272115", "#dfc171", "#fff8e6", "#584b2c", "#171208",
        ),
        "ocean" => (
            "#08131c", "#112635", "#79c8ec", "#ecf8ff", "#304d60", "#071923",
        ),
        "rose" => (
            "#180f17", "#2c1c29", "#e9a4c2", "#fff1f8", "#604154", "#27101d",
        ),
        "forest" => (
            "#11160f", "#212b1b", "#b7cc8c", "#f1f7e9", "#47553b", "#15200d",
        ),
        _ => (
            "#050505", "#101014", "#6e5fe4", "#f5f6fa", "#282832", "#ffffff",
        ),
    };
    let mut css = format!(
        "html{{--ugd-bg:{};--ugd-panel:{};--ugd-accent:{};--ugd-text:{};--ugd-line:{};--ugd-on-accent:{};}}",
        palette.0, palette.1, palette.2, palette.3, palette.4, palette.5
    );
    if preferences.theme == "native" {
        css.push_str("html{--ugd-bg:var(--tg-bg,#050505);--ugd-panel:var(--tg-surface,#101014);--ugd-text:var(--tg-text,#f5f6fa);--ugd-line:var(--tg-divider,#282832);}html[data-theme=light]{--ugd-bg:var(--tg-bg,#f1f2f5);--ugd-panel:var(--tg-surface,#fff);--ugd-text:var(--tg-text,#191b24);--ugd-line:var(--tg-divider,#c5c8d2);}");
    }
    if preferences.theme != "native" {
        css.push_str("html:root{--background:var(--ugd-bg)!important;--foreground:var(--ugd-text)!important;--color-bg:var(--ugd-bg)!important;--tg-bg:var(--ugd-bg)!important;--tg-canvas:var(--ugd-bg)!important;--tg-card:var(--ugd-panel)!important;--tg-surface:var(--ugd-panel)!important;--tg-surface-2:var(--ugd-panel)!important;--tg-menu:var(--ugd-panel)!important;--tg-sheet:var(--ugd-panel)!important;--tg-in-bubble:var(--ugd-panel)!important;--tg-text:var(--ugd-text)!important;--tg-text-secondary:color-mix(in srgb,var(--ugd-text) 75%,var(--ugd-panel))!important;--tg-text-muted:color-mix(in srgb,var(--ugd-text) 68%,var(--ugd-panel))!important;--tg-divider:var(--ugd-line)!important;--tg-sheet-border:var(--ugd-line)!important;--tg-header-bg:var(--ugd-panel)!important;--unx-panel:var(--ugd-panel)!important;--unx-panel-hover:var(--ugd-panel)!important;--unx-panel-border:var(--ugd-line)!important;--tg-card-border:var(--ugd-line)!important;--accent:var(--ugd-accent)!important;--accent-strong:var(--ugd-accent)!important;}");
        css.push_str(&format!(
            "html{{color-scheme:{};}}body,main{{background-color:var(--ugd-bg)!important;color:var(--ugd-text)!important;}}header,aside,nav,article,[role=dialog]{{background-color:var(--ugd-panel)!important;color:var(--ugd-text)!important;border-color:var(--ugd-line)!important;}}input,textarea,select{{color:var(--ugd-text)!important;border-color:var(--ugd-line)!important;accent-color:var(--ugd-accent)!important;background-color:color-mix(in srgb,var(--ugd-panel) 92%,var(--ugd-text) 8%)!important;caret-color:var(--ugd-accent)!important;}}input::placeholder,textarea::placeholder{{color:color-mix(in srgb,var(--ugd-text) 58%,transparent)!important;}}img,video{{filter:none!important;}}",
            if preferences.theme == "light" { "light" } else { "dark" },
        ));
    }
    if preferences.liquid_glass && !preferences.reduce_transparency {
        let strength = preferences.glass_strength.clamp(0.58, 0.90);
        let clear = preferences.glass_mode == "clear";
        let panel_percent = (strength.max(if clear { 0.70 } else { 0.88 }) * 100.0).round();
        let blur = if clear { 18 } else { 10 };
        css.push_str(&format!("header:not(article header),aside,nav,[role=dialog]{{background-color:var(--ugd-panel)!important;color:var(--ugd-text)!important;border-color:var(--ugd-line)!important;}}@supports(backdrop-filter:blur(1px)){{header:not(article header),aside,nav{{background-color:color-mix(in srgb,var(--ugd-panel) {panel_percent}%,transparent)!important;backdrop-filter:blur({blur}px) saturate(115%)!important;-webkit-backdrop-filter:blur({blur}px) saturate(115%)!important;box-shadow:inset 0 1px color-mix(in srgb,var(--ugd-text) 10%,transparent),0 8px 24px #0002!important;}}[role=dialog]{{background-color:color-mix(in srgb,var(--ugd-panel) 94%,transparent)!important;backdrop-filter:blur(10px)!important;}}}}@media(prefers-reduced-transparency:reduce),(forced-colors:active){{header:not(article header),aside,nav,[role=dialog]{{background-color:var(--ugd-panel)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;box-shadow:none!important;}}}}"));
    }
    if preferences.compact_chats {
        css.push_str("html[data-ugd-page='messages'] main{line-height:1.25!important;}");
    }
    if preferences.large_chat_text {
        css.push_str("html[data-ugd-page='messages'] main{font-size:17px!important;}");
    }
    if preferences.smooth_scroll && !preferences.reduce_motion {
        css.push_str("html,body,main,[role=log]{scroll-behavior:smooth!important;}");
    }
    if preferences.underline_links {
        css.push_str(
            "a[href]{text-decoration-line:underline!important;text-underline-offset:.18em;}",
        );
    }
    css.push_str("@media(prefers-reduced-motion:reduce){html,body,main,[role=log],*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important;}}");
    if preferences.reduce_motion {
        css.push_str("*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important;}");
    }
    css
}

#[cfg(test)]
#[path = "theme_tests.rs"]
mod theme_tests;

fn apply_preferences_to_window(window: &tauri::WebviewWindow, preferences: &ClientPreferences) {
    let _ = window.set_fullscreen(preferences.fullscreen);
    let _ = window.set_always_on_top(preferences.always_on_top);
    let _ = window.set_zoom(preferences.zoom.clamp(0.8, 1.4));
    let css = serde_json::to_string(&theme_css(preferences)).unwrap_or_else(|_| "\"\"".to_string());
    let runtime_options = json!({"reconnectEnabled": preferences.reconnect_enabled, "trayUnreadBadge": preferences.tray_unread_badge, "windowsNotifications": preferences.windows_notifications});
    let site_theme = if preferences.theme == "native" {
        "native"
    } else if preferences.theme == "light" {
        "light"
    } else {
        "dark"
    };
    let script = format!(
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
    );
    let _ = window.eval(&script);
}

fn account_window_label(id: u8) -> String {
    if id == 1 {
        "main".to_string()
    } else {
        format!("account-{id}")
    }
}

fn apply_preferences(app: &tauri::AppHandle, preferences: &ClientPreferences) {
    for account in &preferences.accounts {
        if let Some(window) = app.get_webview_window(&account_window_label(account.id)) {
            apply_preferences_to_window(&window, preferences);
        }
    }
}

#[tauri::command]
fn desktop_preferences(app: tauri::AppHandle) -> ClientPreferences {
    load_preferences(&app)
}

#[tauri::command]
fn desktop_save_preferences(
    app: tauri::AppHandle,
    preferences: ClientPreferences,
) -> Result<ClientPreferences, String> {
    // Account membership is changed only by the account commands, never by a stale settings form.
    let current = load_preferences(&app);
    let mut preferences = normalize_preferences(preferences);
    preferences.accounts = current.accounts;
    preferences.active_account = current.active_account;
    write_preferences(&app, &preferences)?;
    apply_preferences(&app, &preferences);
    sync_global_shortcuts(&app, preferences.global_hotkeys);
    Ok(preferences)
}

#[tauri::command]
fn desktop_boot_info() -> BootInfo {
    BootInfo {
        channel: "tauri desktop",
        protocol: "native HTTPS + secure session",
        themes: 9,
        status: "bridge active",
    }
}

fn base_url() -> Result<Url, String> {
    Url::parse(BASE_URL).map_err(|_| "invalid UnixGram base URL".to_string())
}

fn new_client(jar: Arc<Jar>) -> Result<Client, String> {
    new_client_with_timeout(jar, 12)
}

fn new_client_with_timeout(jar: Arc<Jar>, timeout_seconds: u64) -> Result<Client, String> {
    Client::builder()
        .cookie_provider(jar)
        .redirect(Policy::none())
        .timeout(Duration::from_secs(timeout_seconds.clamp(5, 30)))
        .user_agent(UNIXGRAM_HTTP_USER_AGENT)
        .build()
        .map_err(|_| "не удалось создать защищённое HTTPS-подключение".to_string())
}

fn active_account_id(app: &tauri::AppHandle) -> u8 {
    load_preferences(app).active_account.clamp(1, 3)
}

fn session_entry_for_account(account_id: u8) -> Result<Entry, String> {
    Entry::new(
        SESSION_SERVICE,
        &format!("{SESSION_ACCOUNT_PREFIX}-{account_id}"),
    )
    .map_err(|_| "Windows Credential Manager недоступен".to_string())
}

fn session_entry(app: &tauri::AppHandle) -> Result<Entry, String> {
    session_entry_for_account(active_account_id(app))
}

fn stored_cookie(app: &tauri::AppHandle) -> Option<String> {
    session_entry(app).ok()?.get_password().ok()
}

fn save_cookie(app: &tauri::AppHandle, cookie: &str) -> Result<(), String> {
    if cookie.is_empty() || cookie.contains(['\r', '\n']) {
        return Err("UnixGram вернул некорректную сессию".to_string());
    }
    session_entry(app)?
        .set_password(cookie)
        .map_err(|_| "не удалось сохранить сессию в Windows Credential Manager".to_string())
}

fn delete_cookie(app: &tauri::AppHandle) -> Result<(), String> {
    delete_cookie_for_account(active_account_id(app))
}

fn delete_cookie_for_account(account_id: u8) -> Result<(), String> {
    let entry = session_entry_for_account(account_id)?;
    match entry.delete_credential() {
        Ok(()) | Err(keyring::v1::Error::NoEntry) => Ok(()),
        Err(_) => Err("не удалось удалить сохранённую сессию".to_string()),
    }
}

fn cookie_header(jar: &Jar) -> Result<String, String> {
    jar.cookies(&base_url()?)
        .and_then(|value| value.to_str().ok().map(ToOwned::to_owned))
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "UnixGram не выдал cookie сессии".to_string())
}

fn client_with_saved_session(app: &tauri::AppHandle) -> Result<(Client, Arc<Jar>), String> {
    client_with_saved_session_timeout(app, 12)
}

fn client_with_saved_session_timeout(
    app: &tauri::AppHandle,
    timeout_seconds: u64,
) -> Result<(Client, Arc<Jar>), String> {
    let jar = Arc::new(Jar::default());
    if let Some(cookie) = stored_cookie(app) {
        jar.add_cookie_str(&cookie, &base_url()?);
    }
    let client = new_client_with_timeout(jar.clone(), timeout_seconds)?;
    Ok((client, jar))
}

async fn response_json(response: reqwest::Response) -> Result<Value, String> {
    let status = response.status();
    let payload = response
        .json::<Value>()
        .await
        .map_err(|_| "UnixGram вернул неполный ответ".to_string())?;
    if !status.is_success() {
        let code = payload
            .pointer("/error/code")
            .and_then(Value::as_str)
            .unwrap_or("REQUEST_FAILED");
        return Err(format!("UnixGram: {code}"));
    }
    if payload.get("success") == Some(&Value::Bool(false))
        || payload.get("ok") == Some(&Value::Bool(false))
    {
        let code = payload
            .pointer("/error/code")
            .and_then(Value::as_str)
            .unwrap_or("REQUEST_FAILED");
        return Err(format!("UnixGram: {code}"));
    }
    Ok(payload.get("data").cloned().unwrap_or(payload))
}

async fn csrf_token(client: &Client, jar: &Jar) -> Result<String, String> {
    let response = client
        .get(format!("{BASE_URL}/api/auth/csrf"))
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|_| "UnixGram не отвечает".to_string())?;
    let payload = response_json(response).await?;
    if let Some(header) = jar.cookies(&base_url()?)
        && let Ok(cookies) = header.to_str()
    {
        for part in cookies.split(';') {
            if let Some(token) = part.trim().strip_prefix("csrf_token=")
                && !token.is_empty()
            {
                return Ok(token.to_string());
            }
        }
    }
    payload
        .get("csrfToken")
        .or_else(|| payload.get("token"))
        .and_then(Value::as_str)
        .map(ToOwned::to_owned)
        .ok_or_else(|| "UnixGram не выдал CSRF-токен".to_string())
}

async fn verify(client: &Client) -> Result<SessionInfo, String> {
    let response = client
        .get(format!("{BASE_URL}/api/auth/me"))
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|_| "UnixGram не отвечает".to_string())?;
    let payload = response_json(response).await?;
    let account = payload
        .get("account")
        .filter(|value| value.is_object())
        .ok_or_else(|| "сессия UnixGram не подтверждена".to_string())?;
    let username = account
        .get("username")
        .and_then(Value::as_str)
        .map(ToOwned::to_owned);
    let user_id = account
        .get("id")
        .and_then(Value::as_str)
        .map(ToOwned::to_owned);
    Ok(SessionInfo {
        connected: true,
        user_id,
        username,
        storage: "Windows Credential Manager",
        message: "сессия подтверждена".to_string(),
        active_account: None,
    })
}

#[tauri::command]
async fn unixgram_session_status(app: tauri::AppHandle) -> Result<SessionInfo, String> {
    if stored_cookie(&app).is_none() {
        return Ok(SessionInfo {
            connected: false,
            user_id: None,
            username: None,
            storage: "Windows Credential Manager",
            message: "аккаунт не подключён".to_string(),
            active_account: Some(active_account_id(&app)),
        });
    }
    let (client, _) = client_with_saved_session(&app)?;
    match verify(&client).await {
        Ok(info) => Ok(info),
        Err(message) => Ok(SessionInfo {
            connected: false,
            user_id: None,
            username: None,
            storage: "Windows Credential Manager",
            message,
            active_account: Some(active_account_id(&app)),
        }),
    }
}

#[tauri::command]
async fn unixgram_login_password(
    app: tauri::AppHandle,
    input: PasswordLogin,
) -> Result<SessionInfo, String> {
    let email = input.email.trim();
    if email.is_empty() || input.password.len() < 8 || input.password.len() > 72 {
        return Err("проверьте логин и длину пароля".to_string());
    }
    let jar = Arc::new(Jar::default());
    let client = new_client(jar.clone())?;
    let csrf = csrf_token(&client, &jar).await?;
    let mut body = json!({
        "email": email,
        "password": input.password,
        "captchaToken": input.captcha_token,
    });
    if let Some(code) = input.two_factor_code.filter(|code| !code.is_empty()) {
        body["twoFactorCode"] = Value::String(code);
    }
    let response = client
        .post(format!("{BASE_URL}/api/auth/login"))
        .header("Accept", "application/json")
        .header("x-csrf-token", csrf)
        .json(&body)
        .send()
        .await
        .map_err(|_| "UnixGram не отвечает".to_string())?;
    response_json(response).await?;
    let info = verify(&client).await?;
    save_cookie(&app, &cookie_header(&jar)?)?;
    Ok(info)
}

#[tauri::command]
async fn unixgram_qr_start(state: tauri::State<'_, AppState>) -> Result<QrStart, String> {
    let jar = Arc::new(Jar::default());
    let client = new_client(jar.clone())?;
    let csrf = csrf_token(&client, &jar).await?;
    let response = client
        .post(format!("{BASE_URL}/api/auth/qr/start"))
        .header("Accept", "application/json")
        .header("x-csrf-token", csrf)
        .send()
        .await
        .map_err(|_| "UnixGram не отвечает".to_string())?;
    let payload = response_json(response).await?;
    let token = payload
        .get("token")
        .and_then(Value::as_str)
        .filter(|token| token.len() == 64)
        .ok_or_else(|| "UnixGram вернул некорректный QR".to_string())?
        .to_string();
    let approval_url = format!("{BASE_URL}/auth/link?t={token}");
    let mut flow = state
        .qr
        .lock()
        .map_err(|_| "session lock failed".to_string())?;
    *flow = Some(QrFlow { client, jar, token });
    Ok(QrStart {
        approval_url,
        status: "PENDING",
    })
}

#[tauri::command]
async fn unixgram_qr_poll(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<SessionInfo, String> {
    let (client, jar, token) = {
        let flow = state
            .qr
            .lock()
            .map_err(|_| "session lock failed".to_string())?;
        let flow = flow
            .as_ref()
            .ok_or_else(|| "QR-вход не запущен".to_string())?;
        (flow.client.clone(), flow.jar.clone(), flow.token.clone())
    };
    let response = client
        .get(format!(
            "{BASE_URL}/api/auth/qr/status?token={}",
            urlencoding::encode(&token)
        ))
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|_| "UnixGram не отвечает".to_string())?;
    let payload = response_json(response).await?;
    let status = payload
        .get("status")
        .and_then(Value::as_str)
        .unwrap_or("PENDING");
    if status == "PENDING" {
        return Ok(SessionInfo {
            connected: false,
            user_id: None,
            username: None,
            storage: "Windows Credential Manager",
            message: "ожидаем подтверждение QR".to_string(),
            active_account: Some(active_account_id(&app)),
        });
    }
    if status != "APPROVED" {
        return Err(format!("QR-сессия: {status}"));
    }
    let csrf = csrf_token(&client, &jar).await?;
    let response = client
        .post(format!("{BASE_URL}/api/auth/qr/claim"))
        .header("Accept", "application/json")
        .header("x-csrf-token", csrf)
        .json(&json!({ "token": token }))
        .send()
        .await
        .map_err(|_| "UnixGram не отвечает".to_string())?;
    response_json(response).await?;
    let info = verify(&client).await?;
    save_cookie(&app, &cookie_header(&jar)?)?;
    if let Ok(mut flow) = state.qr.lock() {
        *flow = None;
    }
    Ok(info)
}

#[tauri::command]
async fn unixgram_logout(app: tauri::AppHandle) -> Result<(), String> {
    if let Ok((client, jar)) = client_with_saved_session(&app)
        && let Ok(csrf) = csrf_token(&client, &jar).await
    {
        let _ = client
            .post(format!("{BASE_URL}/api/auth/logout"))
            .header("x-csrf-token", csrf)
            .send()
            .await;
    }
    delete_cookie(&app)
}

async fn get_api(client: &Client, path: &str) -> Result<Value, String> {
    let response = client
        .get(format!("{BASE_URL}{path}"))
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|_| "UnixGram не отвечает".to_string())?;
    response_json(response).await
}

async fn get_api_with_retries(
    client: &Client,
    path: &str,
    retry_count: u8,
) -> Result<Value, String> {
    let mut last_error = "UnixGram не отвечает".to_string();
    for attempt in 0..=retry_count.min(3) {
        match get_api(client, path).await {
            Ok(payload) => return Ok(payload),
            Err(error) => last_error = error,
        }
        if attempt < retry_count.min(3) {
            tokio::time::sleep(Duration::from_millis(350 * u64::from(attempt + 1))).await;
        }
    }
    Err(last_error)
}

#[tauri::command]
async fn unixgram_sync(
    app: tauri::AppHandle,
    handle: String,
    timeout_seconds: Option<u64>,
    retry_count: Option<u8>,
    data_saver: Option<bool>,
) -> Result<SyncSnapshot, String> {
    let clean = handle.trim().trim_start_matches('@');
    if clean.len() < 2
        || clean.len() > 32
        || !clean
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || character == '_')
    {
        return Err("некорректный UnixGram username".to_string());
    }
    // Keep the account refresh bounded: the three independent sources run in
    // parallel and a slow gift catalogue must not freeze the entire client.
    let timeout_seconds = timeout_seconds.unwrap_or(10).clamp(5, 15);
    let retry_count = retry_count.unwrap_or(1).min(1);
    let data_saver = data_saver.unwrap_or(false);
    let (client, _) = client_with_saved_session_timeout(&app, timeout_seconds)?;
    let encoded = urlencoding::encode(clean);
    let gift_limit = if data_saver { 8 } else { 24 };
    let feed_limit = if data_saver { 10 } else { 30 };
    let profile_path = format!("/api/social/users/{encoded}");
    let gifts_path = format!("/api/social/users/{encoded}/gifts?limit={gift_limit}&page=0");
    let feed_path = format!("/api/social/users/{encoded}/posts?limit={feed_limit}");
    let (profile_result, gifts_result, feed_result) = tokio::join!(
        get_api_with_retries(&client, &profile_path, retry_count),
        get_api_with_retries(&client, &gifts_path, retry_count),
        get_api_with_retries(&client, &feed_path, retry_count),
    );
    let profile = profile_result?;
    let mut warnings = Vec::new();
    let gifts = gifts_result.unwrap_or_else(|error| {
        warnings.push(format!("подарки временно недоступны: {error}"));
        Value::Null
    });
    let feed = feed_result.unwrap_or_else(|error| {
        warnings.push(format!("лента временно недоступна: {error}"));
        Value::Null
    });
    let fetched_at_epoch = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    Ok(SyncSnapshot {
        profile,
        gifts,
        feed,
        warnings,
        fetched_at_epoch,
    })
}

#[tauri::command]
async fn unixgram_feed(
    app: tauri::AppHandle,
    cursor: Option<String>,
    limit: Option<u16>,
    following: Option<bool>,
    timeout_seconds: Option<u64>,
    retry_count: Option<u8>,
) -> Result<Value, String> {
    let timeout_seconds = timeout_seconds.unwrap_or(12).clamp(5, 30);
    let retry_count = retry_count.unwrap_or(2).min(3);
    let limit = limit.unwrap_or(30).clamp(5, 50);
    let (client, _) = client_with_saved_session_timeout(&app, timeout_seconds)?;
    let mut query = vec![format!("limit={limit}")];
    if following.unwrap_or(false) {
        query.push("following=1".to_string());
    }
    if let Some(cursor) = cursor {
        let cursor = cursor.trim();
        if cursor.is_empty() || cursor.len() > 512 || cursor.chars().any(char::is_control) {
            return Err("UnixGram вернул некорректный cursor ленты".to_string());
        }
        query.push(format!("cursor={}", urlencoding::encode(cursor)));
    }
    get_api_with_retries(
        &client,
        &format!("/api/social/feed?{}", query.join("&")),
        retry_count,
    )
    .await
}

fn validate_post_input(request: &CreatePostRequest) -> Result<String, String> {
    let content = request.content.trim().to_string();
    if content.chars().count() > 4_096 {
        return Err("публикация должна быть короче 4096 символов".to_string());
    }
    if content.is_empty() && request.images.is_empty() {
        return Err("добавьте текст или фотографию".to_string());
    }
    if request.images.len() > 4 {
        return Err("можно прикрепить не больше 4 фотографий".to_string());
    }
    for image in &request.images {
        if image.bytes.is_empty() || image.bytes.len() > 10 * 1024 * 1024 {
            return Err("каждая фотография должна быть меньше 10 МБ".to_string());
        }
        let file_name = image.file_name.trim();
        if file_name.is_empty() || file_name.len() > 160 || file_name.chars().any(char::is_control)
        {
            return Err("некорректное имя фотографии".to_string());
        }
        if !image
            .mime_type
            .trim()
            .to_ascii_lowercase()
            .starts_with("image/")
        {
            return Err("для публикации поддерживаются только изображения".to_string());
        }
    }
    Ok(content)
}

#[tauri::command]
async fn unixgram_create_post(
    app: tauri::AppHandle,
    request: CreatePostRequest,
) -> Result<Value, String> {
    let content = validate_post_input(&request)?;
    let (client, jar) = client_with_saved_session_timeout(&app, 30)?;
    let csrf = csrf_token(&client, &jar).await?;
    let mut image_urls = Vec::with_capacity(request.images.len());

    for image in request.images {
        let file_name = image.file_name.trim().to_string();
        let mime_type = image.mime_type.trim().to_ascii_lowercase();
        let upload = reqwest::multipart::Form::new()
            .text("kind", "post".to_string())
            .part(
                "file",
                reqwest::multipart::Part::bytes(image.bytes)
                    .file_name(file_name)
                    .mime_str(&mime_type)
                    .map_err(|_| "неподдерживаемый формат фотографии".to_string())?,
            );
        let uploaded = client
            .post(format!("{BASE_URL}/api/account/upload"))
            .header("Accept", "application/json")
            .header("x-csrf-token", csrf.clone())
            .multipart(upload)
            .send()
            .await
            .map_err(|_| "UnixGram не загрузил фотографию".to_string())?;
        let payload = response_json(uploaded).await?;
        let url = payload
            .get("url")
            .and_then(Value::as_str)
            .filter(|value| value.starts_with("https://") || value.starts_with('/'))
            .ok_or_else(|| "UnixGram не вернул ссылку на фотографию".to_string())?;
        image_urls.push(url.to_string());
    }

    let client_post_id = request
        .client_post_id
        .filter(|value| value.len() <= 64 && !value.chars().any(char::is_control))
        .unwrap_or_else(|| {
            let epoch = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_nanos();
            format!("desktop-{epoch}")
        });
    let response = client
        .post(format!("{BASE_URL}/api/social/posts"))
        .header("Accept", "application/json")
        .header("x-csrf-token", csrf)
        .json(&json!({
            "content": content,
            "imageUrls": image_urls,
            "videoUrl": Value::Null,
            "poll": Value::Null,
            "audience": "EVERYONE",
            "isNsfw": false,
            "attachments": [],
            "music": Value::Null,
            "clientPostId": client_post_id,
        }))
        .send()
        .await
        .map_err(|_| "UnixGram не опубликовал запись".to_string())?;
    response_json(response).await
}

fn clean_entity_id(value: &str) -> Result<&str, String> {
    let clean = value.trim();
    if clean.len() < 4
        || clean.len() > 128
        || !clean
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || matches!(character, '_' | '-'))
    {
        return Err("некорректный идентификатор UnixGram".to_string());
    }
    Ok(clean)
}

#[tauri::command]
async fn unixgram_sections(app: tauri::AppHandle) -> Result<DesktopSections, String> {
    let (client, _) = client_with_saved_session_timeout(&app, 12)?;
    let (
        messages_result,
        notifications_result,
        communities_result,
        activity_result,
        gift_collections_result,
    ) = tokio::join!(
        get_api_with_retries(&client, "/api/social/messages", 1),
        get_api_with_retries(&client, "/api/social/notifications", 1),
        get_api_with_retries(&client, "/api/social/communities", 1),
        get_api_with_retries(&client, "/api/account/activity", 1),
        get_api_with_retries(&client, "/api/social/gifts/collections", 1),
    );
    let mut warnings = Vec::new();
    let mut optional = |label: &str, result: Result<Value, String>| {
        result.unwrap_or_else(|error| {
            warnings.push(format!("{label}: {error}"));
            Value::Null
        })
    };
    Ok(DesktopSections {
        messages: optional("сообщения", messages_result),
        notifications: optional("уведомления", notifications_result),
        communities: optional("сообщества", communities_result),
        activity: optional("активность", activity_result),
        gift_collections: optional("каталог подарков", gift_collections_result),
        warnings,
    })
}

#[tauri::command]
async fn unixgram_conversation(
    app: tauri::AppHandle,
    conversation_id: String,
) -> Result<Value, String> {
    let clean = clean_entity_id(&conversation_id)?;
    let encoded = urlencoding::encode(clean);
    let (client, _) = client_with_saved_session_timeout(&app, 12)?;
    get_api_with_retries(&client, &format!("/api/social/messages/{encoded}"), 1).await
}

#[tauri::command]
async fn unixgram_send_message(
    app: tauri::AppHandle,
    conversation_id: String,
    content: String,
    reply_to_id: Option<String>,
    reply_quote: Option<String>,
    client_message_id: Option<String>,
) -> Result<Value, String> {
    let clean = clean_entity_id(&conversation_id)?;
    let message = content.trim();
    if message.is_empty() || message.chars().count() > 4_096 {
        return Err("сообщение должно содержать от 1 до 4096 символов".to_string());
    }
    let encoded = urlencoding::encode(clean);
    let (client, jar) = client_with_saved_session_timeout(&app, 12)?;
    let csrf = csrf_token(&client, &jar).await?;
    let reply_to_id = reply_to_id.as_deref().map(clean_entity_id).transpose()?;
    let client_message_id =
        client_message_id.filter(|value| value.len() <= 64 && !value.chars().any(char::is_control));
    let response = client
        .post(format!("{BASE_URL}/api/social/messages/{encoded}"))
        .header("Accept", "application/json")
        .header("x-csrf-token", csrf)
        .json(&json!({
            "content": message,
            "replyToId": reply_to_id,
            "replyQuote": reply_quote.map(|quote| quote.chars().take(240).collect::<String>()),
            "effectId": Value::Null,
            "clientMessageId": client_message_id,
        }))
        .send()
        .await
        .map_err(|_| "UnixGram не отвечает".to_string())?;
    response_json(response).await
}

#[tauri::command]
async fn unixgram_mark_conversation_read(
    app: tauri::AppHandle,
    conversation_id: String,
) -> Result<Value, String> {
    let clean = clean_entity_id(&conversation_id)?;
    let encoded = urlencoding::encode(clean);
    let (client, jar) = client_with_saved_session_timeout(&app, 10)?;
    let csrf = csrf_token(&client, &jar).await?;
    let response = client
        .post(format!("{BASE_URL}/api/social/messages/{encoded}/read"))
        .header("Accept", "application/json")
        .header("x-csrf-token", csrf)
        .send()
        .await
        .map_err(|_| "UnixGram не отвечает".to_string())?;
    response_json(response).await
}

#[tauri::command]
async fn unixgram_react_message(
    app: tauri::AppHandle,
    conversation_id: String,
    message_id: String,
    emoji: String,
) -> Result<Value, String> {
    let clean = clean_entity_id(&conversation_id)?;
    let message_id = clean_entity_id(&message_id)?;
    let emoji = emoji.trim();
    if emoji.is_empty() || emoji.chars().count() > 8 {
        return Err("некорректная реакция".to_string());
    }
    let encoded = urlencoding::encode(clean);
    let (client, jar) = client_with_saved_session_timeout(&app, 10)?;
    let csrf = csrf_token(&client, &jar).await?;
    let response = client
        .post(format!(
            "{BASE_URL}/api/social/messages/{encoded}/reactions"
        ))
        .header("Accept", "application/json")
        .header("x-csrf-token", csrf)
        .json(&json!({ "messageId": message_id, "emoji": emoji }))
        .send()
        .await
        .map_err(|_| "UnixGram не отвечает".to_string())?;
    response_json(response).await
}

#[tauri::command]
async fn unixgram_send_attachment(
    app: tauri::AppHandle,
    request: AttachmentRequest,
) -> Result<Value, String> {
    let AttachmentRequest {
        conversation_id,
        file_name,
        mime_type,
        bytes,
        content,
        reply_to_id,
        reply_quote,
        client_message_id,
    } = request;
    let clean = clean_entity_id(&conversation_id)?;
    if bytes.is_empty() || bytes.len() > 20 * 1024 * 1024 {
        return Err("файл должен быть меньше 20 МБ".to_string());
    }
    let file_name = file_name.trim();
    if file_name.is_empty() || file_name.len() > 160 || file_name.chars().any(char::is_control) {
        return Err("некорректное имя файла".to_string());
    }
    let content = content.trim();
    if content.chars().count() > 4096 {
        return Err("подпись должна быть короче 4096 символов".to_string());
    }
    let client_message_id =
        client_message_id.filter(|value| value.len() <= 64 && !value.chars().any(char::is_control));
    let supplied_mime = mime_type.trim().to_ascii_lowercase();
    let mime_type = if supplied_mime.is_empty() || supplied_mime == "application/octet-stream" {
        mime_guess::from_path(file_name)
            .first_or_octet_stream()
            .to_string()
    } else {
        supplied_mime
    };
    let (upload_kind, media_type) = if mime_type.starts_with("image/") {
        ("chat-image", "image")
    } else if mime_type.starts_with("video/") {
        ("chat-video", "video")
    } else {
        ("chat-file", "file")
    };
    let reply_to_id = reply_to_id.as_deref().map(clean_entity_id).transpose()?;
    let encoded = urlencoding::encode(clean);
    let (client, jar) = client_with_saved_session_timeout(&app, 30)?;
    let csrf = csrf_token(&client, &jar).await?;
    let size_bytes = bytes.len();
    let upload = reqwest::multipart::Form::new()
        .text("kind", upload_kind.to_string())
        .part(
            "file",
            reqwest::multipart::Part::bytes(bytes)
                .file_name(file_name.to_string())
                .mime_str(&mime_type)
                .map_err(|_| "неподдерживаемый тип файла".to_string())?,
        );
    let upload_response = client
        .post(format!("{BASE_URL}/api/account/upload"))
        .header("Accept", "application/json")
        .header("x-csrf-token", csrf.clone())
        .multipart(upload)
        .send()
        .await
        .map_err(|_| "UnixGram не загрузил файл".to_string())?;
    let uploaded = response_json(upload_response).await?;
    let url = uploaded
        .get("url")
        .and_then(Value::as_str)
        .ok_or_else(|| "UnixGram не вернул ссылку на файл".to_string())?;
    let response = client
        .post(format!("{BASE_URL}/api/social/messages/{encoded}"))
        .header("Accept", "application/json")
        .header("x-csrf-token", csrf)
        .json(&json!({
            "content": content,
            "media": {
                "type": media_type,
                "url": url,
                "name": file_name,
                "sizeBytes": size_bytes,
                "mime": mime_type,
            },
            "replyToId": reply_to_id,
            "replyQuote": reply_quote.map(|quote| quote.chars().take(240).collect::<String>()),
            "captionAbove": false,
            "paidStars": Value::Null,
            "clientMessageId": client_message_id,
        }))
        .send()
        .await
        .map_err(|_| "UnixGram не отправил вложение".to_string())?;
    response_json(response).await
}

#[tauri::command]
async fn unixgram_gift_details(app: tauri::AppHandle, gift_id: String) -> Result<Value, String> {
    let clean = clean_entity_id(&gift_id)?;
    let encoded = urlencoding::encode(clean);
    let (client, _) = client_with_saved_session_timeout(&app, 12)?;
    get_api_with_retries(&client, &format!("/api/social/gifts/{encoded}"), 1).await
}

#[tauri::command]
async fn unixgram_search(app: tauri::AppHandle, query: String) -> Result<Value, String> {
    let clean = query.trim();
    if clean.len() < 2 || clean.len() > 80 || clean.chars().any(char::is_control) {
        return Err("поисковый запрос должен содержать от 2 до 80 символов".to_string());
    }
    let (client, _) = client_with_saved_session_timeout(&app, 10)?;
    get_api_with_retries(
        &client,
        &format!("/api/social/search?q={}", urlencoding::encode(clean)),
        1,
    )
    .await
}

#[tauri::command]
fn open_unixgram_url(url: String) -> Result<(), String> {
    let parsed = validate_unixgram_url(&url)?;
    open::that_detached(parsed.as_str()).map_err(|_| "не удалось открыть браузер".to_string())
}

fn validate_unixgram_url(url: &str) -> Result<Url, String> {
    let parsed = Url::parse(url).map_err(|_| "некорректная ссылка".to_string())?;
    if !matches!(
        destination(&parsed),
        Destination::Unixgram | Destination::Unixplace
    ) {
        return Err("клиент открывает только защищённые ссылки UnixGram и UnixPlace".to_string());
    }
    Ok(parsed)
}

fn validate_discord_client_id(client_id: &str) -> Result<&str, String> {
    let trimmed = client_id.trim();
    if !(17..=24).contains(&trimmed.len())
        || !trimmed.chars().all(|character| character.is_ascii_digit())
    {
        return Err("укажите корректный Discord Application ID".to_string());
    }
    Ok(trimmed)
}

fn discord_activity_details(section: &str, show_section: bool) -> String {
    if !show_section {
        return "в приложении".to_string();
    }
    let clean = section
        .trim()
        .chars()
        .filter(|character| !character.is_control())
        .take(96)
        .collect::<String>();
    if clean.is_empty() {
        "в приложении".to_string()
    } else {
        format!("раздел: {clean}")
    }
}

fn discord_activity_payload(details: &str) -> activity::Activity<'_> {
    activity::Activity::new()
        .state("UnixGram Desktop")
        .details(details)
        .assets(
            activity::Assets::new()
                .large_image("unixgram")
                .large_text("UnixGram Desktop"),
        )
        .buttons(vec![activity::Button::new("Открыть UnixGram", BASE_URL)])
}

fn connect_discord_client(client_id: &str) -> Result<DiscordIpcClient, String> {
    let mut client = DiscordIpcClient::new(client_id);
    client
        .connect()
        .map_err(|_| "Discord не запущен или RPC недоступен".to_string())?;
    Ok(client)
}

fn set_discord_activity(client: &mut DiscordIpcClient, details: &str) -> Result<(), String> {
    if client
        .set_activity(discord_activity_payload(details))
        .is_ok()
    {
        return Ok(());
    }

    client
        .reconnect()
        .map_err(|_| "Discord RPC недоступен; переподключение не удалось".to_string())?;
    client
        .set_activity(discord_activity_payload(details))
        .map_err(|_| "Discord отклонил Rich Presence после переподключения".to_string())
}

#[tauri::command]
fn discord_presence(
    state: tauri::State<'_, AppState>,
    enabled: bool,
    client_id: String,
    section: String,
    show_section: bool,
) -> Result<String, String> {
    update_discord_presence(&state, enabled, &client_id, &section, show_section)
}

fn update_discord_presence(
    state: &AppState,
    enabled: bool,
    client_id: &str,
    section: &str,
    show_section: bool,
) -> Result<String, String> {
    let mut active = state
        .discord
        .lock()
        .map_err(|_| "Discord state lock failed".to_string())?;
    if !enabled {
        if let Some(mut client) = active.take() {
            let _ = client.clear_activity();
            let _ = client.close();
        }
        return Ok("выключено".to_string());
    }
    let client_id = validate_discord_client_id(client_id)?;
    if active
        .as_ref()
        .is_none_or(|client| client.client_id != client_id)
    {
        if let Some(mut old) = active.take() {
            let _ = old.close();
        }
        *active = Some(connect_discord_client(client_id)?);
    }
    let details = discord_activity_details(section, show_section);
    let result = active
        .as_mut()
        .ok_or_else(|| "Discord RPC не подключён".to_string())
        .and_then(|client| set_discord_activity(client, &details));
    if let Err(error) = result {
        if let Some(mut stale) = active.take() {
            let _ = stale.close();
        }
        return Err(error);
    }
    Ok("активно".to_string())
}

fn section_from_url(url: &Url) -> &'static str {
    if url.host_str() == Some("place.unixgram.com") {
        return "UnixPlace";
    }
    let path = url.path();
    let route = |base: &str| {
        path == base
            || path
                .strip_prefix(base)
                .is_some_and(|tail| tail.starts_with('/'))
    };
    if route("/u") || route("/dashboard/profile") {
        "Профиль"
    } else if route("/dashboard/bots") {
        "Боты"
    } else if route("/dashboard/messages") {
        "Сообщения"
    } else if route("/dashboard/notifications") {
        "Уведомления"
    } else if route("/communities") || route("/dashboard/communities") {
        "Сообщества"
    } else if route("/dashboard/studio") || route("/dashboard/analytics") {
        "Студия"
    } else if route("/dashboard/gifts") {
        "Подарки"
    } else if route("/dashboard/search") || route("/dashboard/explore") {
        "Поиск"
    } else if route("/dashboard/stars") {
        "Звёзды"
    } else {
        "Лента"
    }
}

fn update_active_section(app: &tauri::AppHandle, url: &Url) {
    update_active_section_label(app, section_from_url(url));
}

fn update_active_section_label(app: &tauri::AppHandle, section: &str) {
    let state = app.state::<AppState>();
    let section = section
        .trim()
        .chars()
        .filter(|character| !character.is_control())
        .take(64)
        .collect::<String>();
    let section = if section.is_empty() {
        "UnixGram".to_string()
    } else {
        section
    };
    if let Ok(mut active) = state.active_section.lock() {
        *active = section.clone();
    }
    let preferences = load_preferences(app);
    let _ = update_discord_presence(
        &state,
        preferences.discord_presence,
        DISCORD_CLIENT_ID,
        &section,
        preferences.discord_show_section,
    );
}

fn unread_from_title(title: &str) -> u32 {
    let trimmed = title.trim_start();
    let Some(rest) = trimmed.strip_prefix('(') else {
        return 0;
    };
    let Some((count, _)) = rest.split_once(')') else {
        return 0;
    };
    count.trim().parse::<u32>().unwrap_or(0).min(999)
}

fn digit_rows(digit: char) -> [&'static str; 5] {
    match digit {
        '0' => ["111", "101", "101", "101", "111"],
        '1' => ["010", "110", "010", "010", "111"],
        '2' => ["111", "001", "111", "100", "111"],
        '3' => ["111", "001", "111", "001", "111"],
        '4' => ["101", "101", "111", "001", "001"],
        '5' => ["111", "100", "111", "001", "111"],
        '6' => ["111", "100", "111", "101", "111"],
        '7' => ["111", "001", "010", "010", "010"],
        '8' => ["111", "101", "111", "101", "111"],
        _ => ["111", "101", "111", "001", "111"],
    }
}

fn badged_tray_icon(base: &Image<'_>, count: u32) -> Image<'static> {
    if count == 0 {
        return base.clone().to_owned();
    }
    let width = base.width();
    let height = base.height();
    let mut rgba = base.rgba().to_vec();
    let diameter = ((width.min(height) as f32 * 0.48).round() as u32).max(12);
    let radius = diameter as i32 / 2;
    let center_x = width as i32 - radius - 1;
    let center_y = height as i32 - radius - 1;
    for y in (center_y - radius).max(0)..=(center_y + radius).min(height as i32 - 1) {
        for x in (center_x - radius).max(0)..=(center_x + radius).min(width as i32 - 1) {
            let dx = x - center_x;
            let dy = y - center_y;
            if dx * dx + dy * dy <= radius * radius {
                let offset = ((y as u32 * width + x as u32) * 4) as usize;
                rgba[offset..offset + 4].copy_from_slice(&[235, 62, 82, 255]);
            }
        }
    }
    let text = count.min(99).to_string();
    let scale = (diameter / 12).max(1) as i32;
    let glyph_width = 3 * scale;
    let spacing = scale;
    let total_width =
        glyph_width * text.len() as i32 + spacing * (text.len().saturating_sub(1) as i32);
    let start_x = center_x - total_width / 2;
    let start_y = center_y - (5 * scale) / 2;
    for (index, digit) in text.chars().enumerate() {
        for (row, pattern) in digit_rows(digit).iter().enumerate() {
            for (column, pixel) in pattern.chars().enumerate() {
                if pixel != '1' {
                    continue;
                }
                for sy in 0..scale {
                    for sx in 0..scale {
                        let x = start_x
                            + index as i32 * (glyph_width + spacing)
                            + column as i32 * scale
                            + sx;
                        let y = start_y + row as i32 * scale + sy;
                        if x >= 0 && y >= 0 && x < width as i32 && y < height as i32 {
                            let offset = ((y as u32 * width + x as u32) * 4) as usize;
                            rgba[offset..offset + 4].copy_from_slice(&[255, 255, 255, 255]);
                        }
                    }
                }
            }
        }
    }
    Image::new_owned(rgba, width, height)
}

fn refresh_tray_status(app: &tauri::AppHandle, total_unread: u32) {
    let state = app.state::<AppState>();
    let online = state.online.load(Ordering::Relaxed);
    if let Some(tray) = app.tray_by_id("unixgram-history") {
        let tooltip = if online {
            if total_unread == 0 {
                "UnixGram Desktop".to_string()
            } else {
                format!("UnixGram Desktop · непрочитано: {total_unread}")
            }
        } else {
            "UnixGram Desktop · нет соединения, восстановим автоматически".to_string()
        };
        let _ = tray.set_tooltip(Some(tooltip));
        if let Some(icon) = app.default_window_icon().cloned() {
            let preferences = load_preferences(app);
            let icon = if preferences.tray_unread_badge {
                badged_tray_icon(&icon, total_unread)
            } else {
                icon
            };
            let _ = tray.set_icon(Some(icon));
        }
    }
}

fn queue_unread_for_window(app: &tauri::AppHandle, label: &str, title: &str) {
    let changed_at = std::time::Instant::now();
    let app = app.clone();
    let label = label.to_string();
    if let Ok(mut pending) = app.state::<AppState>().pending_titles.lock() {
        pending.insert(
            label.clone(),
            (changed_at, title.chars().take(512).collect()),
        );
    }
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(Duration::from_millis(250)).await;
        let title = app
            .state::<AppState>()
            .pending_titles
            .lock()
            .ok()
            .and_then(|mut pending| {
                if pending
                    .get(&label)
                    .is_some_and(|(time, _)| *time == changed_at)
                {
                    pending.remove(&label).map(|(_, title)| title)
                } else {
                    None
                }
            });
        if let Some(title) = title {
            if app.get_webview_window(&label).is_some() {
                update_unread_for_window(&app, &label, &title);
            }
        }
    });
}

fn update_unread_for_window(app: &tauri::AppHandle, label: &str, title: &str) {
    let count = unread_from_title(title);
    let state = app.state::<AppState>();
    let (previous, total) = {
        let Ok(mut counts) = state.unread_by_window.lock() else {
            return;
        };
        let previous = counts.insert(label.to_string(), count);
        let total = counts.values().copied().sum::<u32>().min(999);
        (previous, total)
    };
    refresh_tray_status(app, total);
    let preferences = load_preferences(app);
    let focused = app
        .get_webview_window(label)
        .is_some_and(|window| window.is_focused().unwrap_or(false));
    if preferences.windows_notifications && !focused && previous.is_some_and(|old| count > old) {
        let body = format!("Непрочитанных чатов: {count}");
        let _ = app
            .notification()
            .builder()
            .title("UnixGram Desktop")
            .body(body)
            .show();
    }
}

fn account_profile_directory(app: &tauri::AppHandle, id: u8) -> Result<std::path::PathBuf, String> {
    let root = app
        .path()
        .app_data_dir()
        .map_err(|_| "не удалось открыть папку клиента".to_string())?;
    Ok(root.join("account-profiles").join(format!("account-{id}")))
}

fn available_account_id(accounts: &[AccountProfile]) -> Option<u8> {
    (1..=3).find(|id| !accounts.iter().any(|account| account.id == *id))
}

async fn detach_account_profile_directory(
    app: &tauri::AppHandle,
    id: u8,
) -> Result<Option<std::path::PathBuf>, String> {
    let directory = account_profile_directory(app, id)?;
    if !directory.exists() {
        return Ok(None);
    }
    let root = directory
        .parent()
        .ok_or_else(|| "некорректная папка профиля".to_string())?;
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let detached = root.join(format!(".account-{id}-delete-{nonce}"));
    let mut last_error = None;
    for _ in 0..20 {
        match fs::rename(&directory, &detached) {
            Ok(()) => return Ok(Some(detached)),
            Err(_error) if !directory.exists() => return Ok(None),
            Err(error) => last_error = Some(error),
        }
        tokio::time::sleep(Duration::from_millis(150)).await;
    }
    Err(format!(
        "WebView2 ещё использует профиль; повторите удаление через несколько секунд{}",
        last_error
            .map(|error| format!(" ({})", error.kind()))
            .unwrap_or_default()
    ))
}

fn delete_detached_profile(directory: std::path::PathBuf) {
    std::thread::spawn(move || {
        for _ in 0..20 {
            if !directory.exists() || fs::remove_dir_all(&directory).is_ok() {
                return;
            }
            std::thread::sleep(Duration::from_millis(250));
        }
        eprintln!("не удалось очистить отсоединённый профиль WebView2");
    });
}

async fn prepare_unused_account_slot(app: &tauri::AppHandle, id: u8) -> Result<(), String> {
    delete_cookie_for_account(id)?;
    if let Some(window) = app.get_webview_window(&account_window_label(id)) {
        let _ = window.clear_all_browsing_data();
        let _ = window.destroy();
    }
    if let Some(window) = app.get_webview_window(&format!("unixplace-{id}")) {
        let _ = window.clear_all_browsing_data();
        let _ = window.destroy();
    }
    if let Some(directory) = detach_account_profile_directory(app, id).await? {
        delete_detached_profile(directory);
    }
    Ok(())
}

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

fn initial_window_size(app: &tauri::AppHandle, preferred: (f64, f64)) -> (f64, f64) {
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

fn create_account_window(
    app: &tauri::AppHandle,
    account: &AccountProfile,
    visible: bool,
) -> Result<tauri::WebviewWindow, String> {
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
        WebviewUrl::External(
            Url::parse("https://unixgram.com/dashboard").expect("trusted UnixGram URL"),
        ),
    )
    .title(format!("UnixGram Desktop · {}", account.label))
    .inner_size(width, height)
    .min_inner_size(width.min(360.0), height.min(320.0))
    .resizable(true)
    .center()
    .visible(visible)
    .user_agent(UNIXGRAM_HTTP_USER_AGENT)
    .disable_drag_drop_handler()
    .initialization_script(DESKTOP_RUNTIME)
    .on_download(|webview, event| {
        if let tauri::webview::DownloadEvent::Finished { success, .. } = event {
            if load_preferences(webview.app_handle()).windows_notifications {
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
        }
        true
    })
    .on_new_window(move |url, _| {
        handle_popup(&popup_app, &popup_label, url);
        tauri::webview::NewWindowResponse::Deny
    })
    .on_document_title_changed(move |window, title| {
        queue_unread_for_window(window.app_handle(), &callback_label, &title);
        if window.is_focused().unwrap_or(false) {
            if let Ok(url) = window.url() {
                update_active_section(window.app_handle(), &url);
            }
        }
    });
    if account.id > 1 {
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

fn hide_account_windows(app: &tauri::AppHandle) {
    for id in 1..=3 {
        if let Some(window) = app.get_webview_window(&account_window_label(id)) {
            let _ = window.hide();
        }
    }
}

fn show_active_account(app: &tauri::AppHandle) {
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

fn navigate_active_account(app: &tauri::AppHandle, url: &str) {
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

#[tauri::command]
fn desktop_accounts(app: tauri::AppHandle) -> Vec<AccountProfile> {
    load_preferences(&app).accounts
}

#[tauri::command]
async fn desktop_add_account(
    app: tauri::AppHandle,
    label: String,
) -> Result<ClientPreferences, String> {
    let mut preferences = load_preferences(&app);
    if preferences.accounts.len() >= 3 {
        return Err("можно подключить не больше трёх аккаунтов".to_string());
    }
    let id = available_account_id(&preferences.accounts)
        .ok_or_else(|| "нет свободного профиля".to_string())?;
    prepare_unused_account_slot(&app, id).await?;
    let clean = label
        .trim()
        .chars()
        .filter(|character| !character.is_control())
        .take(32)
        .collect::<String>();
    let account = AccountProfile {
        id,
        label: if clean.is_empty() {
            format!("Аккаунт {id}")
        } else {
            clean
        },
    };
    preferences.accounts.push(account.clone());
    preferences.active_account = id;
    preferences = normalize_preferences(preferences);
    let window = create_account_window(&app, &account, true)?;
    if let Err(error) = write_preferences(&app, &preferences) {
        let _ = window.destroy();
        return Err(error);
    }
    hide_account_windows(&app);
    apply_preferences_to_window(&window, &preferences);
    let _ = window.show();
    let _ = window.set_focus();
    Ok(preferences)
}

#[tauri::command]
fn desktop_switch_account(app: tauri::AppHandle, id: u8) -> Result<ClientPreferences, String> {
    let mut preferences = load_preferences(&app);
    let account = preferences
        .accounts
        .iter()
        .find(|account| account.id == id)
        .cloned()
        .ok_or_else(|| "аккаунт не найден".to_string())?;
    preferences.active_account = id;
    write_preferences(&app, &preferences)?;
    hide_account_windows(&app);
    let window = create_account_window(&app, &account, true)?;
    let _ = window.show();
    let _ = window.set_focus();
    Ok(preferences)
}

#[tauri::command]
async fn desktop_remove_account(
    app: tauri::AppHandle,
    id: u8,
) -> Result<ClientPreferences, String> {
    if let Ok(mut pending) = app.state::<AppState>().pending_titles.lock() {
        pending.remove(&account_window_label(id));
    }
    if let Ok(mut counts) = app.state::<AppState>().unread_by_window.lock() {
        counts.remove(&account_window_label(id));
        refresh_tray_status(&app, counts.values().copied().sum::<u32>().min(999));
    }
    if id == 1 {
        delete_cookie_for_account(1)?;
        if let Some(market) = app.get_webview_window("unixplace") {
            market
                .clear_all_browsing_data()
                .map_err(|_| "не удалось очистить сессию UnixPlace".to_string())?;
            let _ = market.destroy();
        }
        if let Some(window) = app.get_webview_window("main") {
            window.clear_all_browsing_data().map_err(|_| {
                "не удалось очистить локальную сессию основного аккаунта".to_string()
            })?;
            let _ = window.navigate(
                Url::parse("https://unixgram.com/auth/login").expect("trusted UnixGram login URL"),
            );
            let _ = window.show();
            let _ = window.set_focus();
        }
        let mut preferences = load_preferences(&app);
        preferences.active_account = 1;
        write_preferences(&app, &preferences)?;
        return Ok(preferences);
    }
    let mut preferences = load_preferences(&app);
    if !preferences.accounts.iter().any(|account| account.id == id) {
        return Err("аккаунт не найден".to_string());
    }
    delete_cookie_for_account(id)?;
    if let Some(window) = app.get_webview_window(&account_window_label(id)) {
        let _ = window.clear_all_browsing_data();
        let _ = window.destroy();
    }
    if let Some(window) = app.get_webview_window(&format!("unixplace-{id}")) {
        let _ = window.clear_all_browsing_data();
        let _ = window.destroy();
    }
    let detached = detach_account_profile_directory(&app, id).await?;
    preferences.accounts.retain(|account| account.id != id);
    if preferences.active_account == id {
        preferences.active_account = preferences
            .accounts
            .first()
            .map(|account| account.id)
            .unwrap_or(1);
    }
    write_preferences(&app, &preferences)?;
    if let Some(directory) = detached {
        delete_detached_profile(directory);
    }
    show_active_account(&app);
    Ok(preferences)
}

#[tauri::command]
fn desktop_open_creator_profile(app: tauri::AppHandle) -> Result<(), String> {
    validate_unixgram_url(CREATOR_PROFILE_URL)?;
    navigate_active_account(&app, CREATOR_PROFILE_URL);
    Ok(())
}

#[tauri::command]
fn desktop_media_settings(device: String) -> Result<(), String> {
    let target = match device.as_str() {
        "microphone" => "ms-settings:privacy-microphone",
        "camera" => "ms-settings:privacy-webcam",
        "sound" => "ms-settings:sound",
        _ => return Err("неизвестное устройство".to_string()),
    };
    open::that_detached(target).map_err(|_| "не удалось открыть настройки Windows".to_string())
}

#[tauri::command]
fn desktop_security_status(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> SecurityStatus {
    let preferences = load_preferences(&app);
    let hotkeys = state
        .hotkeys
        .lock()
        .ok()
        .map(|status| status.clone())
        .unwrap_or_default();
    SecurityStatus {
        https_only: true,
        trusted_hosts: vec!["unixgram.com", "www.unixgram.com", "place.unixgram.com"],
        session_storage: "изолированные профили WebView2 + Windows Credential Manager",
        isolated_accounts: preferences.accounts.len(),
        max_accounts: 3,
        online: state.online.load(Ordering::Relaxed),
        notifications_private: true,
        discord_private: true,
        global_hotkeys: hotkeys.enabled && hotkeys.registered > 0,
        registered_hotkeys: hotkeys.registered,
        expected_hotkeys: hotkeys.expected,
        unavailable_hotkeys: hotkeys.unavailable,
        version: env!("CARGO_PKG_VERSION"),
    }
}

#[tauri::command]
fn desktop_open_account_window(app: tauri::AppHandle, account_id: u8) -> Result<(), String> {
    if !(1..=3).contains(&account_id) {
        return Err("поддерживаются только слоты 1–3".to_string());
    }
    if account_id == 1 {
        show_main_window(&app);
        return Ok(());
    }
    let account = load_preferences(&app)
        .accounts
        .into_iter()
        .find(|item| item.id == account_id)
        .ok_or_else(|| "аккаунт не найден".to_string())?;
    let window = create_account_window(&app, &account, true)?;
    let _ = window.show();
    let _ = window.set_focus();
    Ok(())
}

#[tauri::command]
fn desktop_shell_state(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    unread_count: u32,
    section: String,
    online: bool,
    window_label: Option<String>,
) -> Result<(), String> {
    let label = window_label
        .unwrap_or_else(|| "desktop-shell".to_string())
        .trim()
        .to_string();
    if label.is_empty() || label.chars().any(char::is_control) {
        return Err("некорректная метка окна".to_string());
    }
    if let Ok(mut active_section) = state.active_section.lock() {
        let clean_section = section
            .trim()
            .chars()
            .filter(|character| !character.is_control())
            .take(64)
            .collect::<String>();
        *active_section = if clean_section.is_empty() {
            "UnixGram".to_string()
        } else {
            clean_section
        };
    }
    state.online.store(online, Ordering::Relaxed);
    if let Ok(mut counts) = state.unread_by_window.lock() {
        counts.insert(label, unread_count.min(999));
        let total = counts.values().copied().sum::<u32>().min(999);
        refresh_tray_status(&app, total);
    }
    Ok(())
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum ShortcutAction {
    Open,
    Messages,
    Market,
    Settings,
}

struct ShortcutBinding {
    shortcut: Shortcut,
    label: &'static str,
    action: ShortcutAction,
}

fn shortcut_bindings() -> Vec<ShortcutBinding> {
    let reliable = Modifiers::CONTROL | Modifiers::SHIFT;
    let legacy = Modifiers::CONTROL | Modifiers::ALT;
    vec![
        ShortcutBinding {
            shortcut: Shortcut::new(Some(reliable), Code::Digit1),
            label: "Ctrl+Shift+1",
            action: ShortcutAction::Open,
        },
        ShortcutBinding {
            shortcut: Shortcut::new(Some(reliable), Code::Digit2),
            label: "Ctrl+Shift+2",
            action: ShortcutAction::Messages,
        },
        ShortcutBinding {
            shortcut: Shortcut::new(Some(reliable), Code::Digit3),
            label: "Ctrl+Shift+3",
            action: ShortcutAction::Market,
        },
        ShortcutBinding {
            shortcut: Shortcut::new(Some(reliable), Code::Digit4),
            label: "Ctrl+Shift+4",
            action: ShortcutAction::Settings,
        },
        ShortcutBinding {
            shortcut: Shortcut::new(Some(legacy), Code::KeyU),
            label: "Ctrl+Alt+U",
            action: ShortcutAction::Open,
        },
        ShortcutBinding {
            shortcut: Shortcut::new(Some(legacy), Code::KeyM),
            label: "Ctrl+Alt+M",
            action: ShortcutAction::Messages,
        },
        ShortcutBinding {
            shortcut: Shortcut::new(Some(legacy), Code::KeyG),
            label: "Ctrl+Alt+G",
            action: ShortcutAction::Market,
        },
        ShortcutBinding {
            shortcut: Shortcut::new(Some(legacy), Code::KeyS),
            label: "Ctrl+Alt+S",
            action: ShortcutAction::Settings,
        },
    ]
}

fn run_shortcut_action(app: &tauri::AppHandle, action: ShortcutAction) {
    match action {
        ShortcutAction::Open => show_main_window(app),
        ShortcutAction::Messages => {
            navigate_main_window(app, "https://unixgram.com/dashboard/messages")
        }
        ShortcutAction::Market => show_market_window(app),
        ShortcutAction::Settings => show_settings_window(app),
    }
}

fn sync_global_shortcuts(app: &tauri::AppHandle, enabled: bool) {
    let manager = app.global_shortcut();
    let mut unavailable = Vec::new();
    if manager.unregister_all().is_err() {
        unavailable.push("предыдущая регистрация Windows".to_string());
    }
    if !enabled {
        if let Ok(mut status) = app.state::<AppState>().hotkeys.lock() {
            *status = HotkeyRuntimeStatus {
                enabled: false,
                registered: 0,
                expected: 0,
                unavailable,
            };
        }
        return;
    }
    let bindings = shortcut_bindings();
    let expected = bindings.len();
    let mut registered = 0;
    for binding in bindings {
        let action = binding.action;
        if manager
            .on_shortcut(binding.shortcut, move |handle, _, event| {
                if event.state == ShortcutState::Pressed {
                    run_shortcut_action(handle, action);
                }
            })
            .is_ok()
        {
            registered += 1;
        } else {
            unavailable.push(binding.label.to_string());
        }
    }
    if let Ok(mut status) = app.state::<AppState>().hotkeys.lock() {
        *status = HotkeyRuntimeStatus {
            enabled: true,
            registered,
            expected,
            unavailable,
        };
    }
}

fn start_connection_monitor(app: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        let client = Client::builder()
            .timeout(Duration::from_secs(6))
            .user_agent(UNIXGRAM_HTTP_USER_AGENT)
            .build();
        let Ok(client) = client else { return };
        loop {
            let online = match client.get(format!("{BASE_URL}/api/health")).send().await {
                Ok(response) if response.status().is_success() => response
                    .json::<Value>()
                    .await
                    .is_ok_and(|payload| payload.get("ok") == Some(&Value::Bool(true))),
                _ => false,
            };
            let state = app.state::<AppState>();
            let was_online = state.online.swap(online, Ordering::Relaxed);
            let failures = if online {
                state
                    .consecutive_network_failures
                    .swap(0, Ordering::Relaxed);
                0
            } else {
                state
                    .consecutive_network_failures
                    .fetch_add(1, Ordering::Relaxed)
                    .saturating_add(1)
            };
            let total = state
                .unread_by_window
                .lock()
                .ok()
                .map(|counts| counts.values().copied().sum::<u32>())
                .unwrap_or(0);
            refresh_tray_status(&app, total);
            let preferences = load_preferences(&app);
            if let Some(window) =
                app.get_webview_window(&account_window_label(preferences.active_account))
            {
                if let Ok(url) = window.url() {
                    update_active_section(&app, &url);
                }
            }
            if !was_online && online && preferences.reconnect_enabled {
                for id in 1..=3 {
                    if let Some(window) = app.get_webview_window(&account_window_label(id)) {
                        let _ = window.eval(RECOVERY_SCRIPT);
                    }
                    let market_label = if id == 1 {
                        "unixplace".to_string()
                    } else {
                        format!("unixplace-{id}")
                    };
                    if let Some(window) = app.get_webview_window(&market_label) {
                        let _ = window.eval(RECOVERY_SCRIPT);
                    }
                }
                if preferences.windows_notifications {
                    let _ = app
                        .notification()
                        .builder()
                        .title("UnixGram Desktop")
                        .body("соединение восстановлено")
                        .show();
                }
            }
            let wait = if online {
                15
            } else {
                (5_u64.saturating_mul(2_u64.saturating_pow(failures.min(3)))).min(60)
            };
            tokio::time::sleep(Duration::from_secs(wait)).await;
        }
    });
}

fn show_main_window(app: &tauri::AppHandle) {
    show_active_account(app);
}

fn navigate_main_window(app: &tauri::AppHandle, url: &str) {
    navigate_active_account(app, url);
}

fn is_unixplace_url(url: &Url) -> bool {
    destination(url) == Destination::Unixplace
}

fn confirm_browser_link(app: &tauri::AppHandle, label: &str, url: &Url) {
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
        .is_ok_and(|mut gate| gate.begin(std::time::Instant::now()))
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
                gate.complete(std::time::Instant::now());
            }
        });
}

fn handle_popup(app: &tauri::AppHandle, label: &str, url: Url) {
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

fn show_market_window(app: &tauri::AppHandle) {
    let account_id = active_account_id(app);
    let label = if account_id == 1 {
        "unixplace".to_string()
    } else {
        format!("unixplace-{account_id}")
    };
    if let Some(window) = app.get_webview_window(&label) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
        return;
    }
    let url = Url::parse("https://place.unixgram.com/").expect("trusted UnixPlace URL");
    show_market_url(app, account_id, &url);
}

fn source_account_id(label: &str) -> u8 {
    label
        .strip_prefix("account-")
        .or_else(|| label.strip_prefix("unixplace-"))
        .and_then(|id| id.parse::<u8>().ok())
        .filter(|id| (1..=3).contains(id))
        .unwrap_or(1)
}

fn show_market_url(app: &tauri::AppHandle, account_id: u8, url: &Url) {
    if !is_unixplace_url(url) {
        return;
    }
    let label = if account_id == 1 {
        "unixplace".to_string()
    } else {
        format!("unixplace-{account_id}")
    };
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
        .user_agent(UNIXGRAM_HTTP_USER_AGENT)
        .on_new_window(move |url, _| {
            handle_popup(&popup_app, &popup_label, url);
            tauri::webview::NewWindowResponse::Deny
        });
    if account_id > 1
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

fn show_settings_window(app: &tauri::AppHandle) {
    update_active_section_label(app, "Настройки");
    if let Some(window) = app.get_webview_window("settings") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
        return;
    }
    let (width, height) = initial_window_size(app, (760.0, 720.0));
    let _ = WebviewWindowBuilder::new(
        app,
        "settings",
        WebviewUrl::App("index.html?desktop-settings=1".into()),
    )
    .title("Настройки UnixGram Desktop")
    .inner_size(width, height)
    .min_inner_size(width.min(360.0), height.min(320.0))
    .center()
    .build();
}

fn should_hide_on_close(label: &str) -> bool {
    label == "main" || label.starts_with("account-")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            show_active_account(app);
        }))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(
            tauri::plugin::Builder::<tauri::Wry, ()>::new("unixgram-navigation")
                .on_navigation(|webview, url| {
                    if should_hide_on_close(webview.label()) && is_unixplace_url(url) {
                        show_market_url(
                            webview.app_handle(),
                            source_account_id(webview.label()),
                            url,
                        );
                        return false;
                    }
                    if should_hide_on_close(webview.label())
                        && validate_unixgram_url(url.as_str()).is_err()
                    {
                        confirm_browser_link(webview.app_handle(), webview.label(), url);
                        return false;
                    }
                    if webview.label().starts_with("unixplace") && !is_unixplace_url(url) {
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
                    if should_hide_on_close(webview.label())
                        || webview.label().starts_with("unixplace")
                    {
                        update_active_section(webview.app_handle(), url);
                    }
                    true
                })
                .build(),
        )
        .setup(|app| {
            let preferences = load_preferences(app.handle());
            let primary = preferences
                .accounts
                .iter()
                .find(|account| account.id == 1)
                .cloned()
                .unwrap_or(AccountProfile {
                    id: 1,
                    label: "Основной".to_string(),
                });
            create_account_window(app.handle(), &primary, preferences.active_account == 1)?;
            let menu = MenuBuilder::new(app)
                .text("show", "Открыть UnixGram")
                .text("feed", "Лента")
                .text("messages", "Сообщения")
                .text("market", "UnixPlace")
                .text("settings", "Настройки клиента")
                .separator()
                .text("quit", "Выйти")
                .build()?;
            let mut tray = TrayIconBuilder::with_id("unixgram-history")
                .tooltip("UnixGram Desktop")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => show_main_window(app),
                    "feed" => navigate_main_window(app, "https://unixgram.com/dashboard"),
                    "messages" => {
                        navigate_main_window(app, "https://unixgram.com/dashboard/messages")
                    }
                    "market" => show_market_window(app),
                    "settings" => show_settings_window(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if matches!(
                        event,
                        TrayIconEvent::DoubleClick {
                            button: MouseButton::Left,
                            ..
                        }
                    ) {
                        show_main_window(tray.app_handle());
                    }
                });
            if let Some(icon) = app.default_window_icon().cloned() {
                tray = tray.icon(icon);
            }
            tray.build(app)?;
            apply_preferences(app.handle(), &preferences);
            sync_global_shortcuts(app.handle(), preferences.global_hotkeys);
            start_connection_monitor(app.handle().clone());
            if preferences.active_account != 1 {
                show_active_account(app.handle());
            }
            let discord_app = app.handle().clone();
            std::thread::spawn(move || {
                loop {
                    let preferences = load_preferences(&discord_app);
                    let state = discord_app.state::<AppState>();
                    let section = state
                        .active_section
                        .lock()
                        .ok()
                        .map(|section| section.clone())
                        .unwrap_or_else(|| "UnixGram".to_string());
                    let _ = update_discord_presence(
                        &state,
                        preferences.discord_presence,
                        DISCORD_CLIENT_ID,
                        &section,
                        preferences.discord_show_section,
                    );
                    std::thread::sleep(Duration::from_secs(15));
                }
            });
            Ok(())
        })
        .on_page_load(|window, _| {
            if should_hide_on_close(window.label()) {
                let preferences = load_preferences(window.app_handle());
                if let Some(webview_window) = window.app_handle().get_webview_window(window.label())
                {
                    apply_preferences_to_window(&webview_window, &preferences);
                }
            }
        })
        .on_window_event(|window, event| {
            if should_hide_on_close(window.label())
                && let tauri::WindowEvent::CloseRequested { api, .. } = event
            {
                api.prevent_close();
                let _ = window.hide();
            } else if window.label().starts_with("unixplace")
                && matches!(event, tauri::WindowEvent::CloseRequested { .. })
            {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                }
                show_main_window(window.app_handle());
            }
        })
        .invoke_handler(tauri::generate_handler![
            desktop_boot_info,
            desktop_preferences,
            desktop_save_preferences,
            desktop_accounts,
            desktop_add_account,
            desktop_switch_account,
            desktop_remove_account,
            desktop_open_creator_profile,
            desktop_media_settings,
            desktop_security_status,
            desktop_open_account_window,
            desktop_shell_state,
            unixgram_session_status,
            unixgram_login_password,
            unixgram_qr_start,
            unixgram_qr_poll,
            unixgram_logout,
            unixgram_sync,
            unixgram_feed,
            unixgram_create_post,
            unixgram_sections,
            unixgram_conversation,
            unixgram_send_message,
            unixgram_mark_conversation_read,
            unixgram_react_message,
            unixgram_send_attachment,
            unixgram_gift_details,
            unixgram_search,
            open_unixgram_url,
            discord_presence,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}

#[cfg(test)]
mod tests {
    use reqwest::Url;
    use tauri::image::Image;

    use super::{
        AccountProfile, CREATOR_PROFILE_URL, ClientPreferences, CreatePostImage, CreatePostRequest,
        ShortcutAction, UNIXGRAM_HTTP_USER_AGENT, account_window_label, available_account_id,
        badged_tray_icon, discord_activity_details, discord_activity_payload, is_unixplace_url,
        normalize_preferences, section_from_url, shortcut_bindings, should_hide_on_close,
        theme_css, unread_from_title, validate_discord_client_id, validate_post_input,
        validate_unixgram_url,
    };

    #[test]
    fn every_custom_theme_keeps_controls_and_media_readable() {
        for theme in [
            "midnight", "oled", "graphite", "aurora", "light", "lucifer", "basaltes", "honey",
            "ocean", "rose", "forest",
        ] {
            let preferences = ClientPreferences {
                theme: theme.to_string(),
                ..ClientPreferences::default()
            };
            let css = theme_css(&preferences);
            assert!(css.contains("--ugd-on-accent:"));
            assert!(!css.contains("button{background-color:transparent!important;}"));
            assert!(css.contains("img,video{filter:none!important;}"));
        }
    }

    #[test]
    fn glass_uses_each_theme_palette_at_every_supported_strength() {
        for theme in [
            "native", "midnight", "oled", "graphite", "aurora", "light", "lucifer", "basaltes",
            "honey", "ocean", "rose", "forest",
        ] {
            for strength in [0.58, 0.72, 0.90] {
                let preferences = ClientPreferences {
                    theme: theme.to_string(),
                    liquid_glass: true,
                    glass_strength: strength,
                    ..ClientPreferences::default()
                };
                let css = theme_css(&preferences);
                assert!(css.contains("var(--ugd-panel)"));
                assert!(css.contains("color:var(--ugd-text)!important"));
                assert!(css.contains("backdrop-filter:blur(10px)"));
                assert!(!css.contains("rgba(15,15,22"));
            }
        }
    }

    #[test]
    fn renders_120_native_theme_setting_states_without_broken_css() {
        let themes = [
            "native", "midnight", "oled", "graphite", "aurora", "light", "lucifer", "basaltes",
            "honey", "ocean", "rose", "forest",
        ];
        let strengths = [0.58, 0.66, 0.72, 0.82, 0.90];

        for state in 0..120 {
            let preferences = ClientPreferences {
                theme: themes[state % themes.len()].to_string(),
                liquid_glass: state % 2 == 0,
                glass_strength: strengths[(state / 2) % strengths.len()],
                compact_chats: state % 3 == 0,
                large_chat_text: state % 5 == 0,
                reduce_motion: state % 7 == 0,
                zoom: [0.8, 1.0, 1.2, 1.4][(state / 3) % 4],
                ..ClientPreferences::default()
            };
            let css = theme_css(&preferences);

            assert!(
                css.contains("--ugd-bg:"),
                "state {state} has no background token"
            );
            assert!(
                css.contains("--ugd-text:"),
                "state {state} has no text token"
            );
            assert!(
                css.contains("--ugd-on-accent:"),
                "state {state} has no control text token"
            );
            assert!(
                !css.contains(";color:transparent!important"),
                "state {state} hides text"
            );
            assert!(
                !css.contains("img{filter:blur") && !css.contains("video{filter:blur"),
                "state {state} blurs media or content"
            );
            assert!(
                !css.contains("svg{"),
                "state {state} globally overrides UnixGram SVG badges"
            );
            if preferences.liquid_glass {
                assert!(
                    css.contains("backdrop-filter:blur(10px)"),
                    "state {state} lost glass styling"
                );
            }
            if preferences.compact_chats {
                assert!(
                    css.contains("data-ugd-page='messages'"),
                    "state {state} lost compact chat scope"
                );
            }
            if preferences.large_chat_text {
                assert!(
                    css.contains("font-size:17px"),
                    "state {state} lost large chat text"
                );
            }
            if preferences.reduce_motion {
                assert!(
                    css.contains("animation-duration:.01ms"),
                    "state {state} lost reduced motion"
                );
            }
        }
    }

    // Settings refresh: preserve saved choices while enabling automatic RPC for new users.
    #[test]
    fn new_preferences_enable_presence_without_overriding_saved_opt_out() {
        let fresh: ClientPreferences = serde_json::from_str("{}").unwrap();
        assert!(fresh.discord_presence);
        assert!(!fresh.discord_show_section);
        assert!(!fresh.smooth_scroll);
        assert!(!fresh.underline_links);
        let saved: ClientPreferences = serde_json::from_str(
            r#"{"discordPresence":false,"smoothScroll":true,"underlineLinks":true}"#,
        )
        .unwrap();
        let restored = normalize_preferences(saved);
        assert!(!restored.discord_presence);
        assert!(restored.smooth_scroll);
        assert!(restored.underline_links);
        let encoded = serde_json::to_value(restored).unwrap();
        assert_eq!(encoded["discordPresence"], false);
        assert_eq!(encoded["smoothScroll"], true);
        assert_eq!(encoded["underlineLinks"], true);
    }

    #[test]
    fn new_themes_survive_normalization_with_distinct_palettes() {
        for (theme, background) in [
            ("ocean", "#08131c"),
            ("rose", "#180f17"),
            ("forest", "#11160f"),
        ] {
            let preferences = normalize_preferences(ClientPreferences {
                theme: theme.to_string(),
                ..ClientPreferences::default()
            });
            assert_eq!(preferences.theme, theme);
            assert!(theme_css(&preferences).contains(&format!("--ugd-bg:{background};")));
        }
        let invalid = normalize_preferences(ClientPreferences {
            theme: "unknown".to_string(),
            ..ClientPreferences::default()
        });
        assert_eq!(invalid.theme, "native");
    }

    #[test]
    fn smooth_scroll_respects_motion_preferences_and_links_are_opt_in() {
        let mut preferences = ClientPreferences::default();
        let default_css = theme_css(&preferences);
        assert!(!default_css.contains("scroll-behavior:smooth"));
        assert!(!default_css.contains("text-decoration-line:underline"));
        preferences.smooth_scroll = true;
        preferences.underline_links = true;
        let css = theme_css(&preferences);
        assert!(css.contains("a[href]{text-decoration-line:underline!important;"));
        let smooth = css.find("scroll-behavior:smooth").unwrap();
        let reduced = css
            .find("@media(prefers-reduced-motion:reduce){html,body,main,[role=log]")
            .unwrap();
        assert!(reduced > smooth);
        assert!(css[reduced..].contains("scroll-behavior:auto!important"));
        preferences.reduce_motion = true;
        assert!(!theme_css(&preferences).contains("scroll-behavior:smooth"));
    }

    #[test]
    fn accepts_exact_https_unixgram_hosts() {
        for url in [
            "https://unixgram.com/dashboard/messages",
            "https://www.unixgram.com/",
            "https://place.unixgram.com/",
        ] {
            let parsed =
                validate_unixgram_url(url).expect("official UnixGram URL must be accepted");
            assert_eq!(parsed.scheme(), "https");
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

    #[test]
    fn validates_text_and_image_posts() {
        let text = CreatePostRequest {
            content: "  привет, UnixGram  ".to_string(),
            images: Vec::new(),
            client_post_id: None,
        };
        assert_eq!(validate_post_input(&text).unwrap(), "привет, UnixGram");

        let image = CreatePostRequest {
            content: String::new(),
            images: vec![CreatePostImage {
                file_name: "photo.png".to_string(),
                mime_type: "image/png".to_string(),
                bytes: vec![1, 2, 3],
            }],
            client_post_id: None,
        };
        assert!(validate_post_input(&image).is_ok());
    }

    #[test]
    fn rejects_empty_or_invalid_posts() {
        let empty = CreatePostRequest {
            content: "   ".to_string(),
            images: Vec::new(),
            client_post_id: None,
        };
        assert!(validate_post_input(&empty).is_err());

        let executable = CreatePostRequest {
            content: String::new(),
            images: vec![CreatePostImage {
                file_name: "payload.exe".to_string(),
                mime_type: "application/octet-stream".to_string(),
                bytes: vec![1],
            }],
            client_post_id: None,
        };
        assert!(validate_post_input(&executable).is_err());
    }

    #[test]
    fn validates_discord_application_ids() {
        assert_eq!(
            validate_discord_client_id("1540399183276539904").unwrap(),
            "1540399183276539904"
        );
        assert!(validate_discord_client_id(" 1540399183276539904 ").is_ok());
        assert!(validate_discord_client_id("discord-app").is_err());
        assert!(validate_discord_client_id("12345").is_err());
    }

    #[test]
    fn formats_discord_details_safely() {
        assert_eq!(discord_activity_details("Лента", true), "раздел: Лента");
        assert_eq!(discord_activity_details(" \n\t ", true), "в приложении");
        assert_eq!(discord_activity_details("ignored", false), "в приложении");
        assert!(
            discord_activity_details(&"a".repeat(120), true)
                .chars()
                .count()
                <= 104
        );
    }

    #[test]
    fn discord_activity_uses_the_published_unixgram_asset() {
        let payload = serde_json::to_value(discord_activity_payload("в приложении"))
            .expect("Discord activity must serialize");
        assert_eq!(payload["assets"]["large_image"], "unixgram");
        assert_eq!(payload["assets"]["large_text"], "UnixGram Desktop");
    }

    #[test]
    fn only_the_main_window_closes_to_tray() {
        assert!(should_hide_on_close("main"));
        assert!(!should_hide_on_close("settings"));
    }

    #[test]
    fn remote_unixgram_window_keeps_a_browser_compatible_branded_user_agent() {
        let source = include_str!("lib.rs");
        assert!(
            source.contains(".user_agent(UNIXGRAM_HTTP_USER_AGENT)")
                && UNIXGRAM_HTTP_USER_AGENT.contains("Mozilla/5.0")
                && UNIXGRAM_HTTP_USER_AGENT
                    .contains(concat!("UnixGramHistory/", env!("CARGO_PKG_VERSION"))),
            "the branded user agent must remain browser-compatible for UnixGram auth and assets"
        );
    }

    #[test]
    fn native_api_client_keeps_the_same_browser_compatible_identity() {
        assert!(UNIXGRAM_HTTP_USER_AGENT.contains("Mozilla/5.0"));
        assert!(UNIXGRAM_HTTP_USER_AGENT.contains("AppleWebKit/537.36"));
        assert!(UNIXGRAM_HTTP_USER_AGENT.contains("Chrome/"));
        assert!(UNIXGRAM_HTTP_USER_AGENT.contains("Safari/537.36"));
        assert!(UNIXGRAM_HTTP_USER_AGENT.contains("Edg/"));
        assert!(
            UNIXGRAM_HTTP_USER_AGENT
                .contains(concat!("UnixGramHistory/", env!("CARGO_PKG_VERSION")))
        );
        assert!(!UNIXGRAM_HTTP_USER_AGENT.contains("UnixGramDesktop/0.1"));
    }

    #[test]
    fn remote_window_automatically_refreshes_only_the_expired_qr_control() {
        let source = include_str!("lib.rs");
        assert!(source.contains("text.includes('qr-код истёк')"));
        assert!(source.contains("text.includes('обновить')"));
        assert!(source.contains("window.__unixgramDesktopLastQrRefresh"));
        assert!(source.contains("< 10_000"));
    }

    #[test]
    fn unread_badge_parser_is_bounded_and_ignores_normal_titles() {
        assert_eq!(unread_from_title("(7) UnixGram"), 7);
        assert_eq!(unread_from_title("  (1200) Сообщения"), 999);
        assert_eq!(unread_from_title("UnixGram (7)"), 0);
        assert_eq!(unread_from_title("(нет) UnixGram"), 0);

        let base = Image::new_owned(vec![0; 32 * 32 * 4], 32, 32);
        let plain = badged_tray_icon(&base, 0);
        let badged = badged_tray_icon(&base, 42);
        assert_eq!(plain.rgba(), base.rgba());
        assert_ne!(badged.rgba(), base.rgba());
    }

    #[test]
    fn account_preferences_are_limited_sanitized_and_keep_primary() {
        let preferences = ClientPreferences {
            theme: "unknown".to_string(),
            active_account: 3,
            accounts: vec![
                AccountProfile {
                    id: 2,
                    label: "  рынок\n".to_string(),
                },
                AccountProfile {
                    id: 2,
                    label: "duplicate".to_string(),
                },
                AccountProfile {
                    id: 4,
                    label: "invalid".to_string(),
                },
            ],
            ..ClientPreferences::default()
        };
        let normalized = normalize_preferences(preferences);
        assert_eq!(normalized.theme, "native");
        assert_eq!(normalized.active_account, 1);
        assert_eq!(normalized.accounts.len(), 2);
        assert_eq!(normalized.accounts[0].id, 1);
        assert_eq!(normalized.accounts[1].label, "рынок");
        assert_eq!(account_window_label(1), "main");
        assert_eq!(account_window_label(3), "account-3");
    }

    #[test]
    fn account_slots_can_be_added_reused_and_reset_without_hidden_following() {
        let primary = AccountProfile {
            id: 1,
            label: "Основной".to_string(),
        };
        let second = AccountProfile {
            id: 2,
            label: "Аккаунт 2".to_string(),
        };
        let third = AccountProfile {
            id: 3,
            label: "Аккаунт 3".to_string(),
        };
        assert_eq!(
            available_account_id(std::slice::from_ref(&primary)),
            Some(2)
        );
        assert_eq!(
            available_account_id(&[primary.clone(), second.clone()]),
            Some(3)
        );
        assert_eq!(available_account_id(&[primary.clone(), third]), Some(2));
        assert_eq!(available_account_id(&[primary, second]), Some(3));
        assert_eq!(CREATOR_PROFILE_URL, "https://unixgram.com/u/basaltes");

        let source = include_str!("lib.rs");
        assert!(source.contains("delete_cookie_for_account(id)"));
        assert!(source.contains("clear_all_browsing_data"));
        assert!(source.contains("prepare_unused_account_slot(&app, id).await"));
        assert!(source.contains("desktop_open_creator_profile"));
    }

    #[test]
    fn discord_sections_are_public_labels_only() {
        let cases = [
            ("https://unixgram.com/dashboard", "Лента"),
            (
                "https://unixgram.com/dashboard/messages/secret",
                "Сообщения",
            ),
            (
                "https://unixgram.com/dashboard/notifications",
                "Уведомления",
            ),
            ("https://unixgram.com/dashboard/gifts", "Подарки"),
            // R2/S3: route boundaries; never include bot names in the label.
            ("https://unixgram.com/dashboard/bots", "Боты"),
            (
                "https://unixgram.com/dashboard/bots/example?start=private",
                "Боты",
            ),
            ("https://unixgram.com/dashboard/botshop", "Лента"),
            ("https://unixgram.com/u/dashboard/bots", "Профиль"),
            ("https://unixgram.com/u/messages", "Профиль"),
            ("https://unixgram.com/dashboard/explore", "Поиск"),
            ("https://unixgram.com/dashboard/analytics", "Студия"),
            ("https://unixgram.com/dashboard/stars", "Звёзды"),
            ("https://unixgram.com/dashboard/messages-other", "Лента"),
            ("https://place.unixgram.com/auction/123", "UnixPlace"),
        ];
        for (url, expected) in cases {
            assert_eq!(section_from_url(&Url::parse(url).unwrap()), expected);
        }
    }

    #[test]
    fn recovery_shortcuts_and_private_notifications_are_wired() {
        let source = include_str!("lib.rs");
        let bindings = shortcut_bindings();
        assert_eq!(bindings.len(), 8);
        assert_eq!(bindings[0].label, "Ctrl+Shift+1");
        assert_eq!(bindings[1].label, "Ctrl+Shift+2");
        assert_eq!(bindings[2].label, "Ctrl+Shift+3");
        assert_eq!(bindings[3].label, "Ctrl+Shift+4");
        assert_eq!(bindings[4].label, "Ctrl+Alt+U");
        for action in [
            ShortcutAction::Open,
            ShortcutAction::Messages,
            ShortcutAction::Market,
            ShortcutAction::Settings,
        ] {
            assert_eq!(
                bindings
                    .iter()
                    .filter(|binding| binding.action == action)
                    .count(),
                2
            );
        }
        assert!(source.contains("const hasDraft"));
        assert!(source.contains("Черновик сохранён"));
        assert!(source.contains("ShortcutState::Pressed"));
        assert!(source.contains("Code::Digit1"));
        assert!(source.contains("Code::Digit2"));
        assert!(source.contains("Code::Digit3"));
        assert!(source.contains("Code::Digit4"));
        assert!(source.contains("Code::KeyU"));
        assert!(source.contains("Code::KeyM"));
        assert!(source.contains("Code::KeyG"));
        assert!(source.contains("Code::KeyS"));
        assert!(source.contains("Непрочитанных чатов:"));
        assert!(source.contains(".body(body)"));
    }
}
