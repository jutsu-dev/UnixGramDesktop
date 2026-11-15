/** Data shapes exchanged with the Rust process. Field names follow the camelCase serde output. */

export type GlassMode = 'frosted' | 'clear'

export type AccountProfile = {
  id: number
  label: string
}

export type Preferences = {
  theme: string
  liquidGlass: boolean
  glassStrength: number
  glassMode: GlassMode
  reduceTransparency: boolean
  compactChats: boolean
  largeChatText: boolean
  reduceMotion: boolean
  smoothScroll: boolean
  underlineLinks: boolean
  fullscreen: boolean
  alwaysOnTop: boolean
  zoom: number
  discordPresence: boolean
  discordShowSection: boolean
  trayUnreadBadge: boolean
  windowsNotifications: boolean
  reconnectEnabled: boolean
  globalHotkeys: boolean
  activeAccount: number
  accounts: AccountProfile[]
}

export type SecurityStatus = {
  httpsOnly: boolean
  trustedHosts: string[]
  sessionStorage: string
  isolatedAccounts: number
  maxAccounts: number
  online: boolean
  notificationsPrivate: boolean
  discordPrivate: boolean
  globalHotkeys: boolean
  registeredHotkeys: number
  expectedHotkeys: number
  unavailableHotkeys: string[]
  version: string
}

/** Windows settings page opened by `desktop_media_settings`. */
export type MediaDevice = 'microphone' | 'camera' | 'sound'

export type DiscordPresenceRequest = {
  enabled: boolean
  section: string
  showSection: boolean
}
