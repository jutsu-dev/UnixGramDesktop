use super::{ClientPreferences, theme_css};

#[test]
fn glass_is_scoped_and_has_accessibility_fallbacks() {
    for mode in ["frosted", "clear"] {
        let preferences = ClientPreferences {
            liquid_glass: true,
            glass_mode: mode.into(),
            ..ClientPreferences::default()
        };
        let css = theme_css(&preferences);
        assert!(css.contains("prefers-reduced-transparency"));
        assert!(!css.contains("[role=dialog],article{background-color:color-mix"));
        assert!(!css.contains("blur(26px)"));
        let opaque = theme_css(&ClientPreferences {
            reduce_transparency: true,
            ..preferences
        });
        assert!(!opaque.contains("backdrop-filter:blur"));
    }
    let light = theme_css(&ClientPreferences {
        theme: "light".into(),
        ..ClientPreferences::default()
    });
    assert!(light.contains("color-scheme:light"));
    assert!(light.contains("--ugd-text:#191b24"));
}

// R2/S2: account for logical work area, including taskbar and DPI.
#[test]
fn window_fits_logical_work_area() {
    for (width, height, dpi) in [
        (1366.0, 728.0, 1.0),
        (1920.0, 1040.0, 1.5),
        (3840.0, 2080.0, 2.0),
        (640.0, 480.0, 2.0),
    ] {
        let size = super::fitted_window_size(width, height, dpi, (1520.0, 960.0));
        assert!(size.0 <= width / dpi - 32.0);
        assert!(size.1 <= height / dpi - 64.0);
        assert!(size.0 > 0.0 && size.1 > 0.0);
    }
    assert_eq!(
        super::fitted_window_size(3840.0, 2160.0, 1.0, (760.0, 720.0)),
        (760.0, 720.0)
    );
}

// S4 / R3: export actual native CSS for browser computed-style assertions.
#[test]
fn export_native_theme_fixtures() {
    let themes = [
        "native", "midnight", "oled", "graphite", "aurora", "light", "lucifer", "basaltes",
        "honey", "ocean", "rose", "forest",
    ];
    let mut fixtures = Vec::new();
    for theme in themes {
        for compact in [false, true] {
            for mode in ["off", "frosted", "clear", "opaque"] {
                let glass = mode != "off";
                let preferences = ClientPreferences {
                    theme: theme.into(),
                    compact_chats: compact,
                    liquid_glass: glass,
                    glass_mode: if mode == "clear" { "clear" } else { "frosted" }.into(),
                    reduce_transparency: mode == "opaque",
                    ..ClientPreferences::default()
                };
                fixtures.push(serde_json::json!({
                    "theme": theme, "compact": compact, "glass": glass, "mode": mode,
                    "css": theme_css(&preferences),
                }));
            }
        }
    }
    assert_eq!(fixtures.len(), 96);
    let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../diagnostics");
    std::fs::create_dir_all(&path).unwrap();
    std::fs::write(
        path.join("native-theme-fixtures.json"),
        serde_json::to_vec(&fixtures).unwrap(),
    )
    .unwrap();
}
