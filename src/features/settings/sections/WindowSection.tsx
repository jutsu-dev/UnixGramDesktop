import { Expand, Monitor } from 'lucide-react'
import type { Preferences } from '../../../shared/ipc'
import { RangeRow } from '../components/RangeRow'
import { SettingsSection } from '../components/SettingsSection'
import { Toggle } from '../components/Toggle'
import type { UpdatePreference } from '../hooks/usePreferences'

type WindowSectionProps = {
  prefs: Preferences
  onChange: UpdatePreference
}

export function WindowSection({ prefs, onChange }: WindowSectionProps) {
  return (
    <SettingsSection icon={Monitor} title="Окно">
      <Toggle
        checked={prefs.fullscreen}
        label="Полный экран"
        onChange={(value) => onChange('fullscreen', value)}
      />
      <Toggle
        checked={prefs.alwaysOnTop}
        label="Поверх остальных окон"
        onChange={(value) => onChange('alwaysOnTop', value)}
      />
      <RangeRow
        icon={Expand}
        label="Масштаб"
        valueLabel={`${Math.round(prefs.zoom * 100)}%`}
        value={prefs.zoom}
        min="0.8"
        max="1.4"
        step="0.05"
        onChange={(value) => onChange('zoom', value)}
      />
    </SettingsSection>
  )
}
