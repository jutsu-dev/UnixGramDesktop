// Kept in a sibling file on purpose: one test inspects the window builders as
// text, and it must not be satisfied by its own assertions.

use super::{fitted_window_size, settings::SETTINGS_PAGE};

// The size is computed from the logical work area, so the taskbar and the DPI
// factor are both accounted for.
#[test]
fn window_fits_logical_work_area() {
    for (width, height, dpi) in [
        (1366.0, 728.0, 1.0),
        (1920.0, 1040.0, 1.5),
        (3840.0, 2080.0, 2.0),
        (640.0, 480.0, 2.0),
    ] {
        let size = fitted_window_size(width, height, dpi, (1520.0, 960.0));
        assert!(size.0 <= width / dpi - 32.0);
        assert!(size.1 <= height / dpi - 64.0);
        assert!(size.0 > 0.0 && size.1 > 0.0);
    }
    assert_eq!(
        fitted_window_size(3840.0, 2160.0, 1.0, (760.0, 720.0)),
        (760.0, 720.0)
    );
}

#[test]
fn invalid_scale_factors_fall_back_to_one() {
    for scale in [0.0, -1.0, f64::NAN, f64::INFINITY] {
        assert_eq!(
            fitted_window_size(1920.0, 1080.0, scale, (1520.0, 960.0)),
            (1520.0, 960.0)
        );
    }
}

#[test]
fn remote_unixgram_windows_keep_the_branded_user_agent() {
    for (name, source) in [
        ("account.rs", include_str!("account.rs")),
        ("market.rs", include_str!("market.rs")),
    ] {
        assert!(
            source.contains(".user_agent(USER_AGENT)"),
            "{name}: the branded user agent must stay on every remote window"
        );
    }
}

#[test]
fn account_windows_keep_their_hardening() {
    let source = include_str!("account.rs");
    assert!(source.contains(".initialization_script(DESKTOP_RUNTIME)"));
    assert!(source.contains(".disable_drag_drop_handler()"));
    assert!(source.contains("tauri::webview::NewWindowResponse::Deny"));
    assert!(include_str!("market.rs").contains("tauri::webview::NewWindowResponse::Deny"));
}

#[test]
fn settings_window_loads_the_bundled_page_without_a_query() {
    assert_eq!(SETTINGS_PAGE, "index.html");
    // The label ties the window to capabilities/settings.json, so pin the builder call itself
    // (an import of the constant must not satisfy this). Whitespace is normalised so the
    // check does not depend on formatting or line endings.
    let source = include_str!("settings.rs")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");
    assert!(source.contains(
        "WebviewWindowBuilder::new( app, SETTINGS_WINDOW_LABEL, WebviewUrl::App(SETTINGS_PAGE.into()), )"
    ));
}
