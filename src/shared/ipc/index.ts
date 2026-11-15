export {
  addAccount,
  isDesktopRuntime,
  loadPreferences,
  loadSecurityStatus,
  openCreatorProfile,
  openMediaSettings,
  removeAccount,
  savePreferences,
  setDiscordPresence,
  switchAccount,
} from './commands'
export { DEFAULT_PREFERENCES, MAX_ACCOUNTS } from './defaults'
export type {
  AccountProfile,
  DiscordPresenceRequest,
  GlassMode,
  MediaDevice,
  Preferences,
  SecurityStatus,
} from './types'
