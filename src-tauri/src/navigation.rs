use reqwest::Url;
use std::time::{Duration, Instant};

#[derive(Debug, PartialEq, Eq)]
pub(crate) enum Destination {
    Unixgram,
    Unixplace,
    External,
    Blocked,
}

pub(crate) fn destination(url: &Url) -> Destination {
    if url.scheme() != "https"
        || url.host_str().is_none()
        || !url.username().is_empty()
        || url.password().is_some()
        || url.port_or_known_default() != Some(443)
        || url.as_str().len() > 8192
    {
        return Destination::Blocked;
    }
    match url.host_str() {
        Some("unixgram.com" | "www.unixgram.com") => Destination::Unixgram,
        Some("place.unixgram.com") => Destination::Unixplace,
        _ => Destination::External,
    }
}

// Shared across account windows: never queue website-generated prompts.
#[derive(Default)]
pub(crate) struct PromptGate {
    pending: bool,
    completed_at: Option<Instant>,
}

impl PromptGate {
    pub(crate) fn begin(&mut self, now: Instant) -> bool {
        if self.pending
            || self
                .completed_at
                .is_some_and(|last| now.duration_since(last) < Duration::from_secs(15))
        {
            return false;
        }
        self.pending = true;
        true
    }

    pub(crate) fn complete(&mut self, now: Instant) {
        self.pending = false;
        self.completed_at = Some(now);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // R1/R2, S1/S2 in docs/BOTS-COMPATIBILITY-PLAN.md. Human review: DEFER.
    #[test]
    fn destinations_keep_external_sites_outside_native_windows() {
        for (url, expected) in [
            ("https://unixgram.com/dashboard/bots", Destination::Unixgram),
            ("https://www.unixgram.com:443/", Destination::Unixgram),
            (
                "https://place.unixgram.com/auction/123",
                Destination::Unixplace,
            ),
            ("https://example.com/?start=bot", Destination::External),
            ("https://unixgram.com.example.com/", Destination::External),
            ("https://user@unixgram.com/", Destination::Blocked),
            ("https://user:pass@example.com/", Destination::Blocked),
            ("https://unixgram.com:444/", Destination::Blocked),
            ("https://place.unixgram.com:444/", Destination::Blocked),
            ("http://unixgram.com/", Destination::Blocked),
            ("javascript:alert(1)", Destination::Blocked),
            ("data:text/html,test", Destination::Blocked),
            ("file:///C:/test.txt", Destination::Blocked),
            ("tg://resolve?domain=example", Destination::Blocked),
        ] {
            assert_eq!(destination(&Url::parse(url).unwrap()), expected, "{url}");
        }
    }

    // R1, S1: duplicate popup attempts neither queue dialogs nor bypass cooldown.
    #[test]
    fn prompts_are_single_flight_and_cool_down_after_completion() {
        let now = Instant::now();
        let mut gate = PromptGate::default();
        assert!(gate.begin(now));
        assert!(!gate.begin(now + Duration::from_secs(60)));
        gate.complete(now + Duration::from_secs(60));
        assert!(!gate.begin(now + Duration::from_secs(74)));
        assert!(gate.begin(now + Duration::from_secs(75)));
    }
}
