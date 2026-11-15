// Kept in a sibling file on purpose: the last test inspects shortcuts.rs as
// text, and it must not be satisfied by its own assertions.

use super::*;

#[test]
fn global_shortcuts_cover_every_action_with_both_key_sets() {
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

    let reliable = Modifiers::CONTROL | Modifiers::SHIFT;
    let legacy = Modifiers::CONTROL | Modifiers::ALT;
    let expected = [
        (reliable, Code::Digit1, "Ctrl+Shift+1", ShortcutAction::Open),
        (
            reliable,
            Code::Digit2,
            "Ctrl+Shift+2",
            ShortcutAction::Messages,
        ),
        (
            reliable,
            Code::Digit3,
            "Ctrl+Shift+3",
            ShortcutAction::Market,
        ),
        (
            reliable,
            Code::Digit4,
            "Ctrl+Shift+4",
            ShortcutAction::Settings,
        ),
        (legacy, Code::KeyU, "Ctrl+Alt+U", ShortcutAction::Open),
        (legacy, Code::KeyM, "Ctrl+Alt+M", ShortcutAction::Messages),
        (legacy, Code::KeyG, "Ctrl+Alt+G", ShortcutAction::Market),
        (legacy, Code::KeyS, "Ctrl+Alt+S", ShortcutAction::Settings),
    ];
    for (binding, (modifiers, code, label, action)) in bindings.iter().zip(expected) {
        assert_eq!(
            binding.shortcut,
            Shortcut::new(Some(modifiers), code),
            "{label}"
        );
        assert_eq!(binding.label, label);
        assert_eq!(binding.action, action);
    }
}

#[test]
fn shortcuts_fire_on_key_press_only() {
    let source = include_str!("shortcuts.rs");
    assert!(source.contains("if event.state == ShortcutState::Pressed {"));
}
