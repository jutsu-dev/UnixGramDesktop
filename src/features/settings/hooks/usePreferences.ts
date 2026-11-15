import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  savePreferences,
  setDiscordPresence,
  type Preferences,
} from '../../../shared/ipc'

/** Section name reported to Discord right after saving; the Rust process updates it on navigation. */
const DISCORD_DEFAULT_SECTION = 'UnixGram'

export type UpdatePreference = <K extends keyof Preferences>(key: K, value: Preferences[K]) => void

type UsePreferencesOptions = {
  setStatus: (message: string) => void
  /** Called after a successful save, when the security centre may show stale data. */
  onSaved: () => void
}

export type PreferencesController = {
  prefs: Preferences
  setPrefs: Dispatch<SetStateAction<Preferences>>
  /** Changes one field of the local draft; nothing is written until `save`. */
  update: UpdatePreference
  save: () => Promise<void>
  saving: boolean
}

/** Loads the stored preferences once, keeps an editable draft and applies it on request. */
export function usePreferences({ setStatus, onSaved }: UsePreferencesOptions): PreferencesController {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void loadPreferences()
      .then((loaded) => setPrefs({ ...DEFAULT_PREFERENCES, ...loaded }))
      .catch(() => setStatus('предпросмотр · настройки не сохранены'))
  }, [setStatus])

  const update: UpdatePreference = (key, value) => {
    setPrefs((current) => ({ ...current, [key]: value }))
  }

  const save = async () => {
    if (saving) return
    setSaving(true)
    setStatus('сохраняем…')
    try {
      const saved = await savePreferences(prefs)
      setPrefs(saved)
      const discordState = await setDiscordPresence({
        enabled: saved.discordPresence,
        section: DISCORD_DEFAULT_SECTION,
        showSection: saved.discordShowSection,
      }).catch((error) => String(error))
      setStatus(saved.discordPresence ? `применено · Discord: ${discordState}` : 'применено')
      onSaved()
    } catch {
      setStatus('не удалось применить')
    } finally {
      setSaving(false)
    }
  }

  return { prefs, setPrefs, update, save, saving }
}
