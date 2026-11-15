//! Global hotkeys. Every action has two bindings: Ctrl+Shift+digit and the
//! older Ctrl+Alt+letter set.

use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

use crate::{
    config::MESSAGES_URL,
    state::{AppState, HotkeyRuntimeStatus},
    windows::{
        navigate_active_account, show_active_account, show_market_window, show_settings_window,
    },
};

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

fn run_shortcut_action(app: &AppHandle, action: ShortcutAction) {
    match action {
        ShortcutAction::Open => show_active_account(app),
        ShortcutAction::Messages => navigate_active_account(app, MESSAGES_URL),
        ShortcutAction::Market => show_market_window(app),
        ShortcutAction::Settings => show_settings_window(app),
    }
}

/// Re-registers every binding and records which ones Windows refused, so the
/// settings window can show the real state.
pub(crate) fn sync_global_shortcuts(app: &AppHandle, enabled: bool) {
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

#[cfg(test)]
#[path = "shortcuts_tests.rs"]
mod tests;
