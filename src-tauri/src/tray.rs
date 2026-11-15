//! Tray icon: menu, unread counting and the badge drawn over the icon.

use std::{
    sync::atomic::Ordering,
    time::{Duration, Instant},
};

use tauri::{
    AppHandle, Manager,
    image::Image,
    menu::MenuBuilder,
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
};
use tauri_plugin_notification::NotificationExt;

use crate::{
    config::{DASHBOARD_URL, MESSAGES_URL},
    preferences::load_preferences,
    state::AppState,
    windows::{
        navigate_active_account, show_active_account, show_market_window, show_settings_window,
    },
};

const TRAY_ID: &str = "unixgram-history";

/// Creates the tray icon with its menu. Called once during setup.
pub(crate) fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let menu = MenuBuilder::new(app)
        .text("show", "Открыть UnixGram")
        .text("feed", "Лента")
        .text("messages", "Сообщения")
        .text("market", "UnixPlace")
        .text("settings", "Настройки клиента")
        .separator()
        .text("quit", "Выйти")
        .build()?;
    let mut tray = TrayIconBuilder::with_id(TRAY_ID)
        .tooltip("UnixGram Desktop")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "show" => show_active_account(app),
            "feed" => navigate_active_account(app, DASHBOARD_URL),
            "messages" => navigate_active_account(app, MESSAGES_URL),
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
                show_active_account(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon().cloned() {
        tray = tray.icon(icon);
    }
    tray.build(app)?;
    Ok(())
}

/// Reads the "(N) Title" prefix that the site and the desktop runtime put in
/// the document title. Bounded to 999.
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

pub(crate) fn refresh_tray_status(app: &AppHandle, total_unread: u32) {
    let state = app.state::<AppState>();
    let online = state.online.load(Ordering::Relaxed);
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
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

/// Debounces title changes: only the last title seen within 250 ms is counted.
pub(crate) fn queue_unread_for_window(app: &AppHandle, label: &str, title: &str) {
    let changed_at = Instant::now();
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
        if let Some(title) = title
            && app.get_webview_window(&label).is_some()
        {
            update_unread_for_window(&app, &label, &title);
        }
    });
}

/// The notification states only how many chats are unread, never who wrote
/// or what was written.
fn unread_notification_body(count: u32) -> String {
    format!("Непрочитанных чатов: {count}")
}

fn update_unread_for_window(app: &AppHandle, label: &str, title: &str) {
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
        let _ = app
            .notification()
            .builder()
            .title("UnixGram Desktop")
            .body(unread_notification_body(count))
            .show();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

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
    fn badge_stays_inside_the_icon_and_caps_the_number_at_two_digits() {
        for size in [16_u32, 24, 32, 48, 256] {
            let base = Image::new_owned(vec![0; (size * size * 4) as usize], size, size);
            let badged = badged_tray_icon(&base, 7);
            assert_eq!((badged.width(), badged.height()), (size, size));
            assert_eq!(badged.rgba().len(), base.rgba().len());
        }
        let base = Image::new_owned(vec![0; 32 * 32 * 4], 32, 32);
        assert_eq!(
            badged_tray_icon(&base, 99).rgba(),
            badged_tray_icon(&base, 1200).rgba()
        );
        assert_ne!(
            badged_tray_icon(&base, 1).rgba(),
            badged_tray_icon(&base, 2).rgba()
        );
    }

    #[test]
    fn unread_notification_reveals_only_the_count() {
        assert_eq!(unread_notification_body(3), "Непрочитанных чатов: 3");
    }
}
