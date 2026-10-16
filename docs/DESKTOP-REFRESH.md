# Desktop refresh

## Scope

Keep the hosted UnixGram interface and its authentication, bot keyboards, invoices,
gift ownership, balance, attachments and call implementation. Do not replace the
website's WebSocket, replay payments, or infer ownership from optimistic UI.

Contract sources (reviewed 2026-10-11):
- https://web.unixgram.com/api/client/
- https://web.unixgram.com/api/realtime/
- https://web.unixgram.com/api/methods/
- https://web.unixgram.com/api/bots/

The only additional authenticated request made by the desktop enhancement is GET
`/api/social/messages/unread-count`, using the current WebView's same-origin cookies.
Accept an explicit nonnegative integer `data.unreadChats` (verified on the authenticated
site on 2026-10-11); retain `data.count` and `data.unreadCount` as compatibility aliases.
Unknown response shapes keep the website title fallback. Never turn a failed request
into a zero count. Respect 429, pause polling after 401, timeout after 8 seconds.
No credentials, message text or response bodies cross the native boundary.

## Visual target

Primary: existing UnixGram layout, icons, density and controls.
Secondary: Dimension's thin glass edges; Desktop.fm's opaque readable light surfaces.
Arc Search contributes only the compact floating utility surface, not its tab layout.

| Decision | Source | Constraint |
| --- | --- | --- |
| Keep post/chat/media layouts | User / UnixGram | Do not recolor SVG badges or bot buttons globally |
| Glass on navigation and dialogs | Dimension via Refero | No blur on all articles; opaque fallback |
| Light palette | Desktop.fm via Refero | Dark foreground, not inversion filters |
| Burgundy / violet-black / amber | User | Preserve Lucifer, basaltes, Honey identities |
| Reduced transparency and motion | Accessibility | Respect OS preferences, no perpetual blur animation |

## Verification boundary

Automated fixtures test shell behavior and generated native CSS. They do not prove
real purchases, calls between devices, bot invoices or refresh-token rotation.
Those need live account tests; never perform financial operations as smoke tests.
