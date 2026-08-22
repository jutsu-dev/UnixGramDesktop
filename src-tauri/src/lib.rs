use discord_rich_presence::{DiscordIpc, DiscordIpcClient, activity};
use keyring::v1::Entry;
use reqwest::{
    Client, Url,
    cookie::{CookieStore, Jar},
    redirect::Policy,
};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::{
    fs,
    sync::{Arc, Mutex},
    time::Duration,
};
use tauri::{
    Manager, WebviewUrl, WebviewWindowBuilder,
    menu::MenuBuilder,
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
};

const BASE_URL: &str = "https://unixgram.com";
const DISCORD_CLIENT_ID: &str = "1540399183276539904";
const SESSION_SERVICE: &str = "com.unixgram.desktop.community";
const SESSION_ACCOUNT: &str = "unixgram-session";

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

#[derive(Default)]
struct AppState {
    qr: Mutex<Option<QrFlow>>,
    discord: Mutex<Option<DiscordIpcClient>>,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(default)]
#[serde(rename_all = "camelCase")]
struct ClientPreferences {
    theme: String,
    liquid_glass: bool,
    glass_strength: f64,
    compact_chats: bool,
    large_chat_text: bool,
    reduce_motion: bool,
    fullscreen: bool,
    always_on_top: bool,
    zoom: f64,
    discord_presence: bool,
    discord_show_section: bool,
}

impl Default for ClientPreferences {
    fn default() -> Self {
        Self {
            theme: "native".to_string(),
            liquid_glass: false,
            glass_strength: 0.72,
            compact_chats: false,
            large_chat_text: false,
            reduce_motion: false,
            fullscreen: false,
            always_on_top: false,
            zoom: 1.0,
            discord_presence: true,
            discord_show_section: false,
        }
    }
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
    preferences_path(app)
        .ok()
        .and_then(|path| fs::read_to_string(path).ok())
        .and_then(|contents| serde_json::from_str(&contents).ok())
        .unwrap_or_default()
}

fn theme_css(preferences: &ClientPreferences) -> String {
    let palette = match preferences.theme.as_str() {
        "midnight" => (
            "#080b16", "#11182a", "#8b7cff", "#edf0ff", "#29304a", "#ffffff",
        ),
        "oled" => (
            "#000000", "#080808", "#7c6cff", "#ffffff", "#242424", "#ffffff",
        ),
        "graphite" => (
            "#101113", "#1a1c20", "#8d96a8", "#f4f5f7", "#343740", "#101113",
        ),
        "aurora" => (
            "#071411", "#0d211d", "#45d6ad", "#effffb", "#24443c", "#06120f",
        ),
        "light" => (
            "#171a21", "#222731", "#8aa4ff", "#f4f6fb", "#3b4452", "#10131a",
        ),
        "lucifer" => (
            "#090506", "#17090d", "#d44a62", "#fff1f3", "#4a1b25", "#ffffff",
        ),
        "basaltes" => (
            "#050308", "#120b1c", "#9d67ff", "#f7efff", "#38224f", "#ffffff",
        ),
        "honey" => (
            "#100e08", "#1c180e", "#d6ad4a", "#fff8df", "#4a4024", "#171208",
        ),
        _ => (
            "#050505", "#101014", "#6e5fe4", "#f5f6fa", "#282832", "#ffffff",
        ),
    };
    let mut css = format!(
        "html{{--ugd-bg:{};--ugd-panel:{};--ugd-accent:{};--ugd-text:{};--ugd-line:{};--ugd-on-accent:{};}}",
        palette.0, palette.1, palette.2, palette.3, palette.4, palette.5
    );
    if preferences.theme != "native" {
        css.push_str(&format!(
            "html{{color-scheme:{};}}body,main{{background-color:var(--ugd-bg)!important;color:var(--ugd-text)!important;}}header,aside,nav,article,[role=dialog]{{background-color:var(--ugd-panel)!important;color:var(--ugd-text)!important;border-color:var(--ugd-line)!important;}}button,a,input,textarea,select{{color:var(--ugd-text)!important;border-color:var(--ugd-line)!important;accent-color:var(--ugd-accent)!important;}}input,textarea,select{{background-color:color-mix(in srgb,var(--ugd-panel) 92%,var(--ugd-text) 8%)!important;caret-color:var(--ugd-accent)!important;}}input::placeholder,textarea::placeholder{{color:color-mix(in srgb,var(--ugd-text) 58%,transparent)!important;}}button{{background-color:transparent!important;}}button:hover,a:hover{{color:var(--ugd-accent)!important;}}button[aria-pressed='true'],button[aria-selected='true'],button[type='submit'],[role='tab'][aria-selected='true']{{background-color:var(--ugd-accent)!important;color:var(--ugd-on-accent)!important;border-color:var(--ugd-accent)!important;}}button:disabled,[aria-disabled='true']{{color:color-mix(in srgb,var(--ugd-text) 42%,transparent)!important;opacity:.68!important;}}svg{{color:inherit!important;}}img,video{{filter:none!important;}}",
            "dark",
        ));
    }
    if preferences.liquid_glass {
        let strength = preferences.glass_strength.clamp(0.58, 0.90);
        let panel_percent = (strength * 100.0).round();
        css.push_str(&format!("body{{background-image:radial-gradient(circle at 12% 8%,color-mix(in srgb,var(--ugd-accent) 28%,transparent),transparent 34%),radial-gradient(circle at 88% 92%,color-mix(in srgb,var(--ugd-accent) 17%,transparent),transparent 38%)!important;background-color:var(--ugd-bg)!important;background-attachment:fixed!important;}}header,aside,nav,[role=dialog],article{{background-color:color-mix(in srgb,var(--ugd-panel) {panel_percent}%,transparent)!important;color:var(--ugd-text)!important;backdrop-filter:blur(26px) saturate(145%)!important;-webkit-backdrop-filter:blur(26px) saturate(145%)!important;box-shadow:inset 0 1px color-mix(in srgb,var(--ugd-text) 10%,transparent),0 18px 50px rgba(0,0,0,.18)!important;border-color:color-mix(in srgb,var(--ugd-text) 14%,transparent)!important;}}"));
    }
    if preferences.compact_chats {
        css.push_str("html[data-ugd-page='messages'] main button{min-height:0!important;padding-top:7px!important;padding-bottom:7px!important;}html[data-ugd-page='messages'] main{line-height:1.25!important;}");
    }
    if preferences.large_chat_text {
        css.push_str("html[data-ugd-page='messages'] main{font-size:17px!important;}");
    }
    if preferences.reduce_motion {
        css.push_str("*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important;}");
    }
    css
}

fn apply_preferences(app: &tauri::AppHandle, preferences: &ClientPreferences) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_fullscreen(preferences.fullscreen);
        let _ = window.set_always_on_top(preferences.always_on_top);
        let _ = window.set_zoom(preferences.zoom.clamp(0.8, 1.4));
        let css =
            serde_json::to_string(&theme_css(preferences)).unwrap_or_else(|_| "\"\"".to_string());
        let script = format!(
            r#"
            (() => {{
              const root = document.documentElement;
              const updatePage = () => {{ root.dataset.ugdPage = location.pathname.includes('/messages') ? 'messages' : 'default'; }};
              updatePage();
              if (window.__unixgramDesktopPageTimer) clearInterval(window.__unixgramDesktopPageTimer);
              window.__unixgramDesktopPageTimer = setInterval(updatePage, 500);
              let style = document.getElementById('unixgram-desktop-preferences');
              if (!style) {{ style = document.createElement('style'); style.id = 'unixgram-desktop-preferences'; document.head.appendChild(style); }}
              style.textContent = {css};
            }})()
        "#
        );
        let _ = window.eval(&script);
    }
}

#[tauri::command]
fn desktop_preferences(app: tauri::AppHandle) -> ClientPreferences {
    load_preferences(&app)
}

#[tauri::command]
fn desktop_save_preferences(
    app: tauri::AppHandle,
    mut preferences: ClientPreferences,
) -> Result<ClientPreferences, String> {
    const THEMES: [&str; 9] = [
        "native", "midnight", "oled", "graphite", "aurora", "light", "lucifer", "basaltes", "honey",
    ];
    if !THEMES.contains(&preferences.theme.as_str()) {
        preferences.theme = "native".to_string();
    }
    preferences.zoom = preferences.zoom.clamp(0.8, 1.4);
    preferences.glass_strength = preferences.glass_strength.clamp(0.58, 0.90);
    let serialized = serde_json::to_string_pretty(&preferences)
        .map_err(|_| "не удалось сохранить настройки".to_string())?;
    fs::write(preferences_path(&app)?, serialized)
        .map_err(|_| "не удалось сохранить настройки".to_string())?;
    apply_preferences(&app, &preferences);
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
        .user_agent("UnixGramDesktop/0.1 (+community client)")
        .build()
        .map_err(|_| "не удалось создать защищённое HTTPS-подключение".to_string())
}

fn session_entry() -> Result<Entry, String> {
    Entry::new(SESSION_SERVICE, SESSION_ACCOUNT)
        .map_err(|_| "Windows Credential Manager недоступен".to_string())
}

fn stored_cookie() -> Option<String> {
    session_entry().ok()?.get_password().ok()
}

fn save_cookie(cookie: &str) -> Result<(), String> {
    if cookie.is_empty() || cookie.contains(['\r', '\n']) {
        return Err("UnixGram вернул некорректную сессию".to_string());
    }
    session_entry()?
        .set_password(cookie)
        .map_err(|_| "не удалось сохранить сессию в Windows Credential Manager".to_string())
}

fn delete_cookie() -> Result<(), String> {
    let entry = session_entry()?;
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

fn client_with_saved_session() -> Result<(Client, Arc<Jar>), String> {
    client_with_saved_session_timeout(12)
}

fn client_with_saved_session_timeout(timeout_seconds: u64) -> Result<(Client, Arc<Jar>), String> {
    let jar = Arc::new(Jar::default());
    if let Some(cookie) = stored_cookie() {
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
    })
}

#[tauri::command]
async fn unixgram_session_status() -> Result<SessionInfo, String> {
    if stored_cookie().is_none() {
        return Ok(SessionInfo {
            connected: false,
            user_id: None,
            username: None,
            storage: "Windows Credential Manager",
            message: "аккаунт не подключён".to_string(),
        });
    }
    let (client, _) = client_with_saved_session()?;
    match verify(&client).await {
        Ok(info) => Ok(info),
        Err(message) => Ok(SessionInfo {
            connected: false,
            user_id: None,
            username: None,
            storage: "Windows Credential Manager",
            message,
        }),
    }
}

#[tauri::command]
async fn unixgram_login_password(input: PasswordLogin) -> Result<SessionInfo, String> {
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
    save_cookie(&cookie_header(&jar)?)?;
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
async fn unixgram_qr_poll(state: tauri::State<'_, AppState>) -> Result<SessionInfo, String> {
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
    save_cookie(&cookie_header(&jar)?)?;
    if let Ok(mut flow) = state.qr.lock() {
        *flow = None;
    }
    Ok(info)
}

#[tauri::command]
async fn unixgram_logout() -> Result<(), String> {
    if let Ok((client, jar)) = client_with_saved_session()
        && let Ok(csrf) = csrf_token(&client, &jar).await
    {
        let _ = client
            .post(format!("{BASE_URL}/api/auth/logout"))
            .header("x-csrf-token", csrf)
            .send()
            .await;
    }
    delete_cookie()
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
    let (client, _) = client_with_saved_session_timeout(timeout_seconds)?;
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
    cursor: Option<String>,
    limit: Option<u16>,
    following: Option<bool>,
    timeout_seconds: Option<u64>,
    retry_count: Option<u8>,
) -> Result<Value, String> {
    let timeout_seconds = timeout_seconds.unwrap_or(12).clamp(5, 30);
    let retry_count = retry_count.unwrap_or(2).min(3);
    let limit = limit.unwrap_or(30).clamp(5, 50);
    let (client, _) = client_with_saved_session_timeout(timeout_seconds)?;
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
async fn unixgram_create_post(request: CreatePostRequest) -> Result<Value, String> {
    let content = validate_post_input(&request)?;
    let (client, jar) = client_with_saved_session_timeout(30)?;
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
async fn unixgram_sections() -> Result<DesktopSections, String> {
    let (client, _) = client_with_saved_session_timeout(12)?;
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
async fn unixgram_conversation(conversation_id: String) -> Result<Value, String> {
    let clean = clean_entity_id(&conversation_id)?;
    let encoded = urlencoding::encode(clean);
    let (client, _) = client_with_saved_session_timeout(12)?;
    get_api_with_retries(&client, &format!("/api/social/messages/{encoded}"), 1).await
}

#[tauri::command]
async fn unixgram_send_message(
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
    let (client, jar) = client_with_saved_session_timeout(12)?;
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
async fn unixgram_mark_conversation_read(conversation_id: String) -> Result<Value, String> {
    let clean = clean_entity_id(&conversation_id)?;
    let encoded = urlencoding::encode(clean);
    let (client, jar) = client_with_saved_session_timeout(10)?;
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
    let (client, jar) = client_with_saved_session_timeout(10)?;
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
async fn unixgram_send_attachment(request: AttachmentRequest) -> Result<Value, String> {
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
    let (client, jar) = client_with_saved_session_timeout(30)?;
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
async fn unixgram_gift_details(gift_id: String) -> Result<Value, String> {
    let clean = clean_entity_id(&gift_id)?;
    let encoded = urlencoding::encode(clean);
    let (client, _) = client_with_saved_session_timeout(12)?;
    get_api_with_retries(&client, &format!("/api/social/gifts/{encoded}"), 1).await
}

#[tauri::command]
async fn unixgram_search(query: String) -> Result<Value, String> {
    let clean = query.trim();
    if clean.len() < 2 || clean.len() > 80 || clean.chars().any(char::is_control) {
        return Err("поисковый запрос должен содержать от 2 до 80 символов".to_string());
    }
    let (client, _) = client_with_saved_session_timeout(10)?;
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
    let trusted_host = matches!(
        parsed.host_str(),
        Some("unixgram.com" | "www.unixgram.com" | "place.unixgram.com")
    );
    if parsed.scheme() != "https" || !trusted_host {
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
    let details = discord_activity_details(&section, show_section);
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

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn navigate_main_window(app: &tauri::AppHandle, url: &str) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.navigate(Url::parse(url).expect("trusted UnixGram URL"));
        show_main_window(app);
    }
}

fn show_settings_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("settings") {
        let _ = window.show();
        let _ = window.set_focus();
        return;
    }
    let _ = WebviewWindowBuilder::new(
        app,
        "settings",
        WebviewUrl::App("index.html?desktop-settings=1".into()),
    )
    .title("Настройки UnixGram Desktop")
    .inner_size(760.0, 720.0)
    .min_inner_size(680.0, 620.0)
    .center()
    .build();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .setup(|app| {
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
                    "market" => navigate_main_window(app, "https://place.unixgram.com/"),
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
            apply_preferences(app.handle(), &load_preferences(app.handle()));
            let discord_app = app.handle().clone();
            std::thread::spawn(move || {
                loop {
                    let preferences = load_preferences(&discord_app);
                    let state = discord_app.state::<AppState>();
                    let _ = update_discord_presence(
                        &state,
                        preferences.discord_presence,
                        DISCORD_CLIENT_ID,
                        "UnixGram",
                        preferences.discord_show_section,
                    );
                    std::thread::sleep(Duration::from_secs(15));
                }
            });
            Ok(())
        })
        .on_page_load(|window, _| {
            if window.label() == "main" {
                let app = window.app_handle();
                apply_preferences(app, &load_preferences(app));
            }
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            desktop_boot_info,
            desktop_preferences,
            desktop_save_preferences,
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
    use super::{
        ClientPreferences, CreatePostImage, CreatePostRequest, discord_activity_details,
        discord_activity_payload, theme_css, validate_discord_client_id, validate_post_input,
        validate_unixgram_url,
    };

    #[test]
    fn every_custom_theme_keeps_controls_and_media_readable() {
        for theme in [
            "midnight", "oled", "graphite", "aurora", "light", "lucifer", "basaltes", "honey",
        ] {
            let preferences = ClientPreferences {
                theme: theme.to_string(),
                ..ClientPreferences::default()
            };
            let css = theme_css(&preferences);
            assert!(css.contains("--ugd-on-accent:"));
            assert!(css.contains("button[type='submit']"));
            assert!(css.contains("img,video{filter:none!important;}"));
        }
    }

    #[test]
    fn glass_uses_each_theme_palette_at_every_supported_strength() {
        for theme in [
            "native", "midnight", "oled", "graphite", "aurora", "light", "lucifer", "basaltes",
            "honey",
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
                assert!(css.contains("backdrop-filter:blur(26px)"));
                assert!(!css.contains("rgba(15,15,22"));
            }
        }
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
}
