use super::{DEFAULT_THEME, THEMES, is_known_theme, site_theme, theme_css};
use crate::preferences::{ClientPreferences, normalize_preferences};

#[test]
fn catalog_lists_every_theme_once_with_the_default_first() {
    let ids = THEMES.iter().map(|theme| theme.id).collect::<Vec<_>>();
    assert_eq!(
        ids,
        [
            "native",
            "midnight",
            "oled",
            "graphite",
            "aurora",
            "light",
            "lucifer",
            "basaltes",
            "honey",
            "ocean",
            "rose",
            "forest",
            "mexican-pink",
        ]
    );
    assert_eq!(THEMES[0].id, DEFAULT_THEME);
    assert!(ids.iter().all(|id| is_known_theme(id)));
    assert!(!is_known_theme("unknown"));
    assert!(!is_known_theme(""));
}

#[test]
fn site_theme_follows_the_selected_theme() {
    assert_eq!(site_theme("native"), "native");
    assert_eq!(site_theme("light"), "light");
    for theme in THEMES
        .iter()
        .map(|theme| theme.id)
        .filter(|id| !["native", "light"].contains(id))
    {
        assert_eq!(site_theme(theme), "dark", "{theme}");
    }
}

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

#[test]
fn every_custom_theme_keeps_controls_and_media_readable() {
    for theme in [
        "midnight",
        "oled",
        "graphite",
        "aurora",
        "light",
        "lucifer",
        "basaltes",
        "honey",
        "ocean",
        "rose",
        "forest",
        "mexican-pink",
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
        "native",
        "midnight",
        "oled",
        "graphite",
        "aurora",
        "light",
        "lucifer",
        "basaltes",
        "honey",
        "ocean",
        "rose",
        "forest",
        "mexican-pink",
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
fn renders_all_native_theme_setting_states_without_broken_css() {
    let themes = [
        "native",
        "midnight",
        "oled",
        "graphite",
        "aurora",
        "light",
        "lucifer",
        "basaltes",
        "honey",
        "ocean",
        "rose",
        "forest",
        "mexican-pink",
    ];
    let strengths = [0.58, 0.66, 0.72, 0.82, 0.90];

    for state in 0..themes.len() * 10 {
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

#[test]
fn new_themes_survive_normalization_with_distinct_palettes() {
    for (theme, background) in [
        ("ocean", "#08131c"),
        ("rose", "#180f17"),
        ("forest", "#11160f"),
        ("mexican-pink", "#140911"),
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

// Exports the real theme CSS to diagnostics/native-theme-fixtures.json, where
// tests/e2e/bot-theme-compatibility.spec.ts reads it for computed-style checks.
#[test]
fn export_native_theme_fixtures() {
    let themes = [
        "native",
        "midnight",
        "oled",
        "graphite",
        "aurora",
        "light",
        "lucifer",
        "basaltes",
        "honey",
        "ocean",
        "rose",
        "forest",
        "mexican-pink",
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
    assert_eq!(fixtures.len(), themes.len() * 8);
    let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../diagnostics");
    std::fs::create_dir_all(&path).unwrap();
    std::fs::write(
        path.join("native-theme-fixtures.json"),
        serde_json::to_vec(&fixtures).unwrap(),
    )
    .unwrap();
}
