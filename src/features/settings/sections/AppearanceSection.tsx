import { Palette, Sparkles } from 'lucide-react'
import type { GlassMode, Preferences } from '../../../shared/ipc'
import { themes } from '../../../shared/theme/themes'
import { RangeRow } from '../components/RangeRow'
import { SettingsSection } from '../components/SettingsSection'
import { Toggle } from '../components/Toggle'
import { MAX_PANEL_OPACITY, minPanelOpacity } from '../glass'
import type { UpdatePreference } from '../hooks/usePreferences'

const GLASS_MODES: readonly { mode: GlassMode; label: string }[] = [
  { mode: 'frosted', label: 'Матовое' },
  { mode: 'clear', label: 'Прозрачное' },
]

type AppearanceSectionProps = {
  prefs: Preferences
  /** Effective panel opacity, already clamped for the current glass mode. */
  panelOpacity: number
  onChange: UpdatePreference
}

export function AppearanceSection({ prefs, panelOpacity, onChange }: AppearanceSectionProps) {
  const transparencyPercent = prefs.reduceTransparency ? 0 : Math.round((1 - panelOpacity) * 100)

  return (
    <SettingsSection icon={Palette} title="Оформление">
      <div className="theme-grid">
        {themes.map((theme) => (
          <button
            key={theme.id}
            className={prefs.theme === theme.id ? 'theme-card active' : 'theme-card'}
            onClick={() => onChange('theme', theme.id)}
          >
            <i style={{ background: theme.accent }} />
            <span>
              <strong>{theme.title}</strong>
              <small>{theme.note}</small>
            </span>
            <b />
          </button>
        ))}
      </div>

      <Toggle
        checked={prefs.liquidGlass}
        label="Liquid Glass"
        note="прозрачные панели и размытие"
        onChange={(value) => onChange('liquidGlass', value)}
      />

      {prefs.liquidGlass && (
        <div className="glass-modes" role="group" aria-label="Вид стекла">
          {GLASS_MODES.map(({ mode, label }) => (
            <button
              key={mode}
              type="button"
              aria-pressed={prefs.glassMode === mode}
              onClick={() => onChange('glassMode', mode)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {prefs.liquidGlass && (
        <RangeRow
          className="glass-strength"
          icon={Sparkles}
          label="Прозрачность"
          ariaLabel="Прозрачность панелей"
          valueLabel={`${transparencyPercent}%`}
          value={panelOpacity}
          min={minPanelOpacity(prefs.glassMode).toFixed(2)}
          max={MAX_PANEL_OPACITY.toFixed(2)}
          step="0.01"
          disabled={prefs.reduceTransparency}
          onChange={(value) => onChange('glassStrength', value)}
        />
      )}

      <Toggle
        checked={prefs.reduceTransparency}
        label="Без прозрачности"
        note="Плотные панели во всех темах"
        onChange={(value) => onChange('reduceTransparency', value)}
      />
    </SettingsSection>
  )
}
