//! Theme catalog and the CSS injected into UnixGram pages. Pure functions only.

use crate::preferences::ClientPreferences;

/// One catalog entry. The colours become --ugd-* custom properties on the site.
pub(crate) struct Theme {
    pub(crate) id: &'static str,
    background: &'static str,
    panel: &'static str,
    accent: &'static str,
    text: &'static str,
    line: &'static str,
    on_accent: &'static str,
}

/// Keeps the site's own colours; only the accent tokens are provided.
pub(crate) const DEFAULT_THEME: &str = "native";

pub(crate) const THEMES: [Theme; 13] = [
    Theme {
        id: "native",
        background: "#050505",
        panel: "#101014",
        accent: "#6e5fe4",
        text: "#f5f6fa",
        line: "#282832",
        on_accent: "#ffffff",
    },
    Theme {
        id: "midnight",
        background: "#0a0e1a",
        panel: "#151d30",
        accent: "#a097ff",
        text: "#edf0ff",
        line: "#35415b",
        on_accent: "#101426",
    },
    Theme {
        id: "oled",
        background: "#000000",
        panel: "#0b0b0e",
        accent: "#a397ff",
        text: "#ffffff",
        line: "#303037",
        on_accent: "#100c23",
    },
    Theme {
        id: "graphite",
        background: "#121416",
        panel: "#202328",
        accent: "#b3bdce",
        text: "#f4f5f7",
        line: "#414752",
        on_accent: "#101113",
    },
    Theme {
        id: "aurora",
        background: "#091612",
        panel: "#142820",
        accent: "#71dab5",
        text: "#effffb",
        line: "#355348",
        on_accent: "#06120f",
    },
    Theme {
        id: "light",
        background: "#f1f2f5",
        panel: "#ffffff",
        accent: "#5948c7",
        text: "#191b24",
        line: "#c5c8d2",
        on_accent: "#ffffff",
    },
    Theme {
        id: "lucifer",
        background: "#10080b",
        panel: "#241018",
        accent: "#e78a9d",
        text: "#fff1f3",
        line: "#58303d",
        on_accent: "#270b13",
    },
    Theme {
        id: "basaltes",
        background: "#08050e",
        panel: "#191023",
        accent: "#bb97ff",
        text: "#f7efff",
        line: "#49315f",
        on_accent: "#180d29",
    },
    Theme {
        id: "honey",
        background: "#15120b",
        panel: "#272115",
        accent: "#dfc171",
        text: "#fff8e6",
        line: "#584b2c",
        on_accent: "#171208",
    },
    Theme {
        id: "ocean",
        background: "#08131c",
        panel: "#112635",
        accent: "#79c8ec",
        text: "#ecf8ff",
        line: "#304d60",
        on_accent: "#071923",
    },
    Theme {
        id: "rose",
        background: "#180f17",
        panel: "#2c1c29",
        accent: "#e9a4c2",
        text: "#fff1f8",
        line: "#604154",
        on_accent: "#27101d",
    },
    Theme {
        id: "forest",
        background: "#11160f",
        panel: "#212b1b",
        accent: "#b7cc8c",
        text: "#f1f7e9",
        line: "#47553b",
        on_accent: "#15200d",
    },
    Theme {
        id: "mexican-pink",
        background: "#140911",
        panel: "#28121f",
        accent: "#e4007c",
        text: "#fff3f9",
        line: "#60344d",
        on_accent: "#ffffff",
    },
];

pub(crate) fn is_known_theme(id: &str) -> bool {
    THEMES.iter().any(|theme| theme.id == id)
}

fn palette_for(id: &str) -> &'static Theme {
    THEMES
        .iter()
        .find(|theme| theme.id == id)
        .unwrap_or(&THEMES[0])
}

/// Value forced into the site's data-theme attribute while a theme is active.
pub(crate) fn site_theme(theme: &str) -> &'static str {
    if theme == DEFAULT_THEME {
        "native"
    } else if theme == "light" {
        "light"
    } else {
        "dark"
    }
}

pub(crate) fn theme_css(preferences: &ClientPreferences) -> String {
    let palette = palette_for(&preferences.theme);
    let mut css = format!(
        "html{{--ugd-bg:{};--ugd-panel:{};--ugd-accent:{};--ugd-text:{};--ugd-line:{};--ugd-on-accent:{};}}",
        palette.background,
        palette.panel,
        palette.accent,
        palette.text,
        palette.line,
        palette.on_accent
    );
    if preferences.theme == DEFAULT_THEME {
        css.push_str("html{--ugd-bg:var(--tg-bg,#050505);--ugd-panel:var(--tg-surface,#101014);--ugd-text:var(--tg-text,#f5f6fa);--ugd-line:var(--tg-divider,#282832);}html[data-theme=light]{--ugd-bg:var(--tg-bg,#f1f2f5);--ugd-panel:var(--tg-surface,#fff);--ugd-text:var(--tg-text,#191b24);--ugd-line:var(--tg-divider,#c5c8d2);}");
    }
    if preferences.theme != DEFAULT_THEME {
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
mod tests;
