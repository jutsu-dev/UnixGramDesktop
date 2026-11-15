import { invoke, isTauri } from '@tauri-apps/api/core'
import type { DiscordPresenceRequest, MediaDevice, Preferences, SecurityStatus } from './types'

/**
 * The complete IPC surface of the desktop shell: nine commands.
 * Nothing outside this module calls `invoke` directly.
 */

/** False in a plain browser (dev server, Storybook, e2e preview), where every command rejects. */
export function isDesktopRuntime(): boolean {
  return isTauri()
}

export function loadPreferences(): Promise<Preferences> {
  return invoke<Preferences>('desktop_preferences')
}

export function savePreferences(preferences: Preferences): Promise<Preferences> {
  return invoke<Preferences>('desktop_save_preferences', { preferences })
}

export function addAccount(label: string): Promise<Preferences> {
  return invoke<Preferences>('desktop_add_account', { label })
}

export function switchAccount(id: number): Promise<Preferences> {
  return invoke<Preferences>('desktop_switch_account', { id })
}

export function removeAccount(id: number): Promise<Preferences> {
  return invoke<Preferences>('desktop_remove_account', { id })
}

export function openCreatorProfile(): Promise<void> {
  return invoke<void>('desktop_open_creator_profile')
}

export function openMediaSettings(device: MediaDevice): Promise<void> {
  return invoke<void>('desktop_media_settings', { device })
}

export function loadSecurityStatus(): Promise<SecurityStatus> {
  return invoke<SecurityStatus>('desktop_security_status')
}

/** Resolves with a short human-readable connection state. */
export function setDiscordPresence({ enabled, section, showSection }: DiscordPresenceRequest): Promise<string> {
  return invoke<string>('discord_presence', { enabled, section, showSection })
}
