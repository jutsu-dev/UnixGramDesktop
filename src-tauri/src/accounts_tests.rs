// Kept in a sibling file on purpose: the last test inspects accounts.rs as
// text, and it must not be satisfied by its own assertions.

use super::*;

#[test]
fn only_account_windows_close_to_tray() {
    assert!(is_account_window("main"));
    assert!(is_account_window("account-2"));
    assert!(!is_account_window("settings"));
    assert!(!is_account_window("unixplace"));
}

#[test]
fn window_labels_map_to_account_slots_and_back() {
    assert_eq!(account_window_label(1), "main");
    assert_eq!(account_window_label(3), "account-3");
    assert_eq!(market_window_label(1), "unixplace");
    assert_eq!(market_window_label(2), "unixplace-2");
    assert!(is_market_window("unixplace"));
    assert!(is_market_window("unixplace-3"));
    assert!(!is_market_window("main"));
    assert!(!is_market_window("settings"));
    for (label, id) in [
        ("main", 1),
        ("account-2", 2),
        ("account-3", 3),
        ("unixplace", 1),
        ("unixplace-2", 2),
        ("unixplace-3", 3),
        ("account-4", 1),
        ("account-x", 1),
        ("settings", 1),
    ] {
        assert_eq!(source_account_id(label), id, "{label}");
    }
}

#[test]
fn legacy_keyring_cleanup_targets_the_entries_old_versions_wrote() {
    assert_eq!(LEGACY_SESSION_SERVICE, "com.unixgram.desktop.community");
    assert_eq!(legacy_session_account(1), "unixgram-session-1");
    assert_eq!(legacy_session_account(3), "unixgram-session-3");
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
    assert_eq!(
        available_account_id(&[primary.clone(), third.clone()]),
        Some(2)
    );
    assert_eq!(
        available_account_id(&[primary.clone(), second.clone()]),
        Some(3)
    );
    assert_eq!(available_account_id(&[primary, second, third]), None);

    let source = include_str!("accounts.rs");
    assert!(source.contains("purge_legacy_keyring_session(id)"));
    assert!(source.contains("clear_all_browsing_data"));
    assert!(source.contains("prepare_unused_account_slot(app, id).await"));
}
