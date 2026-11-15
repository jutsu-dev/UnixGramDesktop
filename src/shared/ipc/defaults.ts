import type { Preferences } from './types'

/** Upper bound of isolated account slots; mirrors the limit enforced by the Rust process. */
export const MAX_ACCOUNTS = 3

/**
 * Shown until the Rust process answers, and in the browser preview where it never does.
 * Also fills in fields that a preferences file written by an older version lacks.
 */
export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'native',
  liquidGlass: false,
  glassStrength: 0.72,
  glassMode: 'frosted',
  reduceTransparency: false,
  compactChats: false,
  largeChatText: false,
  reduceMotion: false,
  smoothScroll: false,
  underlineLinks: false,
  fullscreen: false,
  alwaysOnTop: false,
  zoom: 1,
  discordPresence: true,
  discordShowSection: false,
  trayUnreadBadge: true,
  windowsNotifications: true,
  reconnectEnabled: true,
  globalHotkeys: true,
  activeAccount: 1,
  accounts: [{ id: 1, label: 'Основной' }],
}
