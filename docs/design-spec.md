# UnixGram Desktop Design Spec

## Scope

This spec is for the current desktop client in `src/App.tsx`, `src/Messenger.css`,
`src/NativeDesktop.css`, and `src/index.css`.

It does not propose a total product rewrite. It keeps the current information
architecture, live UnixGram session model, and theme token system, then fixes the
parts that still feel like a mock, a dashboard, or an "AI layout" instead of a
native UnixGram desktop client.

Primary visual direction:

- UnixGram Native for default theme and proportions.
- Messenger Dark for density, message rhythm, and chat hierarchy.
- Telegram macOS Big Sur concepts for desktop shell behavior, soft chrome, and
  cleaner split between left list, center conversation, and right details.

Reference mood links:

- `https://dribbble.com/shots/16317849-Web-Messenger-UI`
- `https://dribbble.com/shots/15343641-Messenger-Dark-theme`
- `https://dribbble.com/shots/14725874-Telegram-macOS-Big-Sur-Dark-Mode-redesign`
- `https://dribbble.com/shots/19752905-Messenger-Dashboard`
- `https://dribbble.com/shots/18723293-Messenger-Dashboard`

## Product Goals

- Make every major UnixGram section feel real, touchable, and consistent with the
  live product.
- Reduce "card soup" and oversized empty areas.
- Make the first 3 seconds clear: splash, login, shell, then real data.
- Prefer UnixGram entities over generic dashboard wording.
- Keep desktop density high enough for active use.

## Priority

### P0

- Auth screen must feel like the start of the real client, not a settings embed.
- Feed, profile, gifts, and messages must all support direct primary actions.
- Navigation must feel stable across sections.
- Search and profile routing must always open UnixGram entities, not Telegram or
  placeholder actions.
- Remove mixed visual language between `Messenger.css` and `NativeDesktop.css`.
- Empty, loading, partial, and offline states must be explicit but compact.

### P1

- Tighten themes so all variants inherit the same spacing and component geometry.
- Refine right context pane so it helps instead of duplicating content.
- Add reusable header, metrics, and entity-card patterns for future sections.

## Shell

### Layout

- Keep three desktop shells:
  - content: rail / workspace / context
  - messages: icon rail / dialogs / chat / context
  - settings: rail / settings panel
- Default content grid:
  - rail `224px`
  - workspace `minmax(760px, 1fr)`
  - context `320px`
- Default messages grid:
  - mini rail `68px`
  - dialogs `332px`
  - chat `minmax(620px, 1fr)`
  - context `304px`
- Use `18px` outer horizontal padding inside desktop heads.
- Do not center the entire app in decorative gutters. The workspace itself can
  constrain content, but the shell should feel full-window.

### Rail

- Keep only one navigation pattern. Do not switch between "full labeled rail" and
  "special one-off gift/profile/settings buttons" below the nav.
- Final order:
  - `Лента`
  - `Поиск`
  - `Уведомления`
  - `Сообщения`
  - `Сообщества`
  - `Студия`
  - `Подарки`
  - `Профиль`
  - divider
  - `Настройки`
- All rail items use the same hit area:
  - desktop full rail `44px` height
  - mini rail `48px` square
- Badge placement:
  - top-right of icon
  - minimum size `18px`
  - never overlap the rail border
- Active state:
  - one background fill
  - one border tint
  - no extra pseudo-strip

### Resizers

- Keep rail, dialogs, and context resizers.
- Hover target `9px`, visible line `1px`.
- On keyboard focus, show the same accent line as hover.
- Double click on resizer resets that panel to default width.

## Splash And Auth

### Splash

- Keep it single-purpose:
  - logo
  - product name
  - one progress line
  - one environment line
- Do not show more than two status rows.
- Timing:
  - if boot completes under `700ms`, still hold splash for `700ms` to avoid a flash
  - if boot exceeds `3s`, change copy from "проверяем сессию…" to
    "подключаем UnixGram…"

### Auth Gate

- Make auth the first real screen, not a settings card.
- Two-column desktop auth:
  - left visual block `minmax(360px, 0.95fr)`
  - right action block `minmax(460px, 1.05fr)`
- Left side:
  - logo
  - product value
  - three trust bullets
  - no giant decorative copy
- Right side:
  - title
  - method tabs
  - active panel
  - session status
- Login tabs:
  - `QR-код`
  - `Браузер`
  - `Пароль`
- Tab behavior:
  - Left/Right arrows cycle tabs
  - focus remains on selected tab
  - tabpanel receives focus only on `Tab`, not on selection
- Password panel:
  - labels always visible above inputs
  - email, password, 2FA stacked with `12px` gap
  - primary button full width only on auth screen
- QR panel:
  - when QR absent, show one illustration and one action
  - when QR present, keep the same card size; replace illustration with QR
  - add countdown text or stale state instead of silently clearing
- Browser panel:
  - one explanatory paragraph
  - one primary action
  - one small note about browser confirmation

### Auth Error States

- Invalid password: inline under the form, `role="alert"`, keep fields intact.
- CAPTCHA required: show a dedicated info card with only browser and QR options
  enabled; password form stays visible but disabled.
- Session active: collapse auth panels and replace with connected account summary.

## Feed

### Structural Direction

- The feed should read like UnixGram, not like cards inside a dashboard.
- Keep the center column framed, but remove unnecessary visual boxing.

### Width And Rhythm

- Feed frame width `760px` in Native theme.
- Composer and posts use a shared horizontal padding `18px`.
- Post rhythm:
  - `16px` top spacing between posts is too card-like
  - reduce vertical gap to `0`
  - separate posts with `1px` border line or `8px` padded seam
- Target line length:
  - `65-78` characters for long text blocks

### Header

- Header row:
  - `Лента` title
  - online state
  - search icon
  - compose action
- Keep sticky header and sticky tabs.
- Tabs:
  - `Для вас`
  - `Подписки`
  - `Теги`
- Active tab underline `2px`.
- Inactive tabs should still have `44px` minimum target height.

### Composer

- Composer should visually match the first post shell.
- Use:
  - avatar `40px`
  - text area min height `88px`
  - media strip under text
  - tools row with photo and count
  - publish button right-aligned
- Remove fake "identity row" that disappears into `display: contents`.
- Show username and display name in a real inline meta row above the textarea.

### Post Card

- Replace generic rounded "widget card" feel with flatter timeline blocks:
  - radius `12px`
  - subtle hover only in preview themes
  - Native theme should feel closer to the site
- Post head:
  - author button
  - badges
  - time
  - more menu
- Display name, badge, premium, emoji, username should wrap cleanly.
- Media:
  - 1 image `16:10`
  - 2 images `2 x equal`
  - 3 images `2 top, 1 full bottom`
  - 4+ images `2 x 2`
- Gift attachment should look like a native attached entity:
  - thumbnail `56px`
  - title
  - serial if present
  - one plain secondary line

### Feed States

- Loading:
  - keep header and tabs fixed
  - show 3 skeleton posts with avatar, 2 meta lines, and media placeholder
- Empty signed-out:
  - `Войдите в UnixGram`
  - single secondary line
  - one action
- Empty signed-in:
  - `Публикаций пока нет`
  - optional `Обновить`
- Error:
  - keep list frame
  - show one compact block with retry

## Search

### Information Architecture

- Search must stop looking like a utility panel and become a primary workspace.
- Keep one query field and segmented result blocks.
- Show summary row directly under search input.

### Query Rules

- Query under 2 chars:
  - do not show full empty blocks
  - show one instructional placeholder
- Query active and loading:
  - keep previous results visible
  - add top progress state instead of full replacement
- Query error:
  - show error banner above results, not instead of results

### Result Groups

- Order:
  - profiles
  - posts
  - gifts
  - communities
  - hashtags
- Result row height `64px`.
- Every row must have:
  - visual mark
  - primary label
  - one metadata line
  - optional badge
- Profile and community rows open inside the app first.
- Post rows should not eject to the browser immediately. They should open a post
  preview sheet or switch to profile/feed context first, with browser as a second action.

## Messages

### Layout

- Messages are already the strongest section. Keep the four-panel model.
- Improve density and action clarity instead of redesigning the structure.

### Dialog List

- Dialog row height `72px`.
- Internal structure:
  - avatar `42px`
  - name row
  - preview row
  - time aligned right
- Unread pill sits in the preview row, not jammed into the text.
- Row click opens chat and marks active immediately.
- Keyboard:
  - Up/Down cycles rows
  - Enter opens row

### Chat Header

- Chat header must show:
  - avatar
  - title
  - conversation type
  - profile action
- Add future slots for call and more actions, but disable visually if backend is not
  ready. Do not leave dead icons with no explanation.

### Messages

- Bubble max width `min(68%, 640px)`.
- Outgoing and incoming must differ more by fill than by border only.
- Bubble anatomy:
  - sender line only for incoming groups
  - reply strip
  - text/media
  - reaction row
  - footer with time and read state
- Show read state consistently:
  - sent: single check
  - delivered/read: double check
- Bubble actions should appear on hover and focus-within, but stay keyboard reachable.
- Reaction quick action should be a real button with accessible name.

### Composer

- Composer fixed to bottom.
- Layout:
  - attach button
  - input area
  - send button
- Multi-state header above composer:
  - reply chip
  - attachment chip
- Keep send button visible at all times.
- `Ctrl+Enter` sends only in multiline mode if textarea is used later; for the current
  single-line input, Enter sends.

### Message States

- Loading:
  - keep chat header
  - skeleton inside message list only
- Empty:
  - `в этом диалоге пока нет сообщений`
- Error:
  - one inline card with retry

## Profile

### Profile Header

- Profile must become a proper entity page, not a set of blocks.
- Use one unified header card:
  - cover `100% x 220px`
  - avatar `112px`
  - identity block
  - actions block
  - stats row
- Avatar overlaps cover by `56px`.
- Action cluster:
  - `Подарки`
  - `Открыть в UnixGram`
  - optional `Поделиться`
- Do not push actions above the identity block.

### Identity

- Order:
  - display name
  - verification/premium/emoji
  - username link
  - bio
  - alternate usernames chips if available
- Stats in a single row on desktop:
  - posts
  - followers
  - following
  - gifts

### Tabs

- Tabs:
  - `Посты`
  - `Подарки`
  - `Медиа`
- All tabs must behave as real tabs.
- `Подарки` can route to the gifts screen, but visually it must still feel like one
  of the profile sections.

### Profile Content

- Posts tab reuses feed post component with a profile variant.
- Media tab uses a tighter `4-column` grid on desktop and opens lightbox on click.
- Empty posts and empty media each need their own placeholder copy.

## Gifts

### Primary Direction

- Gifts must stop feeling like a dashboard inside a dashboard.
- Split the screen into:
  - mode tabs
  - account/market toolbar
  - top metrics
  - selected gift inspector
  - result grid

### Tabs

- Keep:
  - `За аккаунтом`
  - `По рынку`
  - `Передачи`
  - `Топ покупок`
- Active tab should immediately change data context and empty-state copy.

### Toolbar

- Account picker must behave like a compact inline entity selector, not an ad hoc input.
- Default structure:
  - label
  - current account chip or inline input
  - change action
- On submit or blur:
  - normalize `@`
  - validate allowed chars
  - keep focus if invalid

### Metrics

- Three equal cards in one row:
  - gifts count
  - collection estimate
  - market collections
- Metric cards use same height and same baseline alignment.

### Inspector

- Inspector should be the hero object of the screen.
- Grid:
  - art `156px`
  - detail copy `minmax(0, 1fr)`
  - side facts `188px`
- Show:
  - title
  - serial
  - collection
  - traits
  - up to 4 recent history items
  - owner action
  - primary open button
- History entries need cleaner actor links and arrow separators.

### Grid

- Gift card min width `240px`.
- Card height fixed by layout, not by text explosion.
- Card anatomy:
  - art area `112px`
  - title line
  - metadata line
  - price + delta row
- Card click selects; secondary open action stays in inspector.
- Do not duplicate long owner strings in every mode.

### Gifts States

- `За аккаунтом` with no account:
  - focused empty state with account hint
- `Передачи` with no history:
  - explain that the account has gifts but no visible transfer history
- Detail load failure:
  - keep base selected gift visible
  - show a compact inline warning inside inspector only

## Settings

### Layout

- Settings already have strong coverage but weak visual grouping.
- Keep left category list and right content.
- Left nav width `252px`.
- Right panel max width `860px`.

### Content Rules

- Every settings block:
  - title
  - one line note
  - controls list
- Avoid repeating explanatory text under every toggle.
- Toggles should use one consistent row height `60px`.
- Segment rows should use pill groups with equal-height options.

### Sections

- Keep current sections, but sort them by day-to-day relevance:
  - `Сессия`
  - `Внешний вид`
  - `Интерфейс`
  - `Уведомления`
  - `Данные`
  - `Окно`
  - `Возможности`
  - `Discord`
  - `О приложении`

## Context Pane

- The right pane should never duplicate the main content one-to-one.
- Allowed roles:
  - quick profile summary
  - selected gift summary
  - status and support
  - conversation info
- Not allowed:
  - duplicate full posts
  - duplicate full profile body
  - duplicate full metrics already centered in workspace

## States

### Loading

- Use in-place skeletons.
- Preserve final layout dimensions to prevent jumps.
- Never replace the whole app shell with a spinner after unlock.

### Partial Failure

- Profile failure must not blank feed, gifts, or messages.
- Gifts detail failure must not block gift list.
- Search failure must preserve local results if available.
- Conversation failure must keep the selected dialog and composer shell visible.

### Offline

- Keep the top connection banner.
- Banner copy:
  - title `нет сети`
  - detail `показываем последние синхронизированные данные`
- Add one retry action in views where retry is meaningful.

## Accessibility

### Focus Order

- App start:
  - skip link
  - shell header primary actions
  - left rail
  - active workspace controls
  - right pane
- Auth:
  - active login tab
  - first field or primary action inside panel
  - session status

### Keyboard Behavior

- Rail buttons:
  - Tab enters current item
  - Arrow navigation optional but not required
- Tabs:
  - Left/Right arrows move within tablists
  - selection changes on activation, not on plain focus
- Dialog list:
  - Up/Down navigation
  - Enter opens
- Lightbox:
  - Escape closes
  - Left/Right arrows move media
- Profile/media grids:
  - Enter opens media
  - Escape closes lightbox and returns focus to source tile

### Accessibility Requirements

- No icon-only interactive element without `aria-label`.
- Inputs must not rely on placeholder-only labeling.
- Error text uses `role="alert"` only when it changes due to user or network action.
- Preserve visible focus rings across all themes.
- Minimum text contrast `4.5:1`, UI boundary contrast `3:1`.

## Design Tokens And Components

### Keep

- Current theme token system in `src/index.css`.
- Current split of generic shell rules in `Messenger.css` and final desktop overrides in
  `NativeDesktop.css`, but reduce overlap.
- Existing reusable primitives:
  - `VerifiedBadge`
  - `SafeExternalLink`
  - `UnixLink`
  - `ToggleRow`
  - `SegmentRow`

### Add

- `EntityHeaderCard`
  - used by profile and gift inspector side cases
- `StatusBanner`
  - top offline / degraded message
- `InlineError`
  - compact per-section error block
- `SkeletonRow`, `SkeletonPost`, `SkeletonGridCard`
- `SectionTabs`
  - shared for feed, gifts, profile, auth methods

### Avoid

- New heavy UI library.
- Per-screen hardcoded colors.
- One-off button variants for every section.

## Implementation Constraints

- Keep browser-preview mode working without Tauri.
- Do not remove live Tauri command flow from `App.tsx` until view extraction is complete.
- First extract structure, then split code.
- Visual cleanup should happen together with component extraction to avoid redoing CSS twice.

## Suggested Delivery Order

1. Auth and splash polish.
2. Shell and rail normalization.
3. Feed flattening and post/composer cleanup.
4. Messages density and bubble actions.
5. Profile header rebuild.
6. Gifts rebuild.
7. Search result restructuring.
8. Settings polish.
9. Context pane pass.

## Open Product Decisions

- Should post search results open an in-app preview first or go straight to the browser?
- Should `Подарки` inside profile be a routed screen or an embedded sub-tab later?
- Should communities stay profile-like or eventually get a dedicated entity type?
- Is Discord presence allowed to show account display name, or only the current section?
