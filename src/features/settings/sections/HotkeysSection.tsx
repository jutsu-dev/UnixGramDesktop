import { Keyboard } from 'lucide-react'
import type { Preferences, SecurityStatus } from '../../../shared/ipc'
import { SettingsSection } from '../components/SettingsSection'
import { Toggle } from '../components/Toggle'
import type { UpdatePreference } from '../hooks/usePreferences'

const SHORTCUTS: readonly { keys: readonly string[]; action: string }[] = [
  { keys: ['Ctrl', 'Shift', '1'], action: 'Открыть UnixGram' },
  { keys: ['Ctrl', 'Shift', '2'], action: 'Сообщения' },
  { keys: ['Ctrl', 'Shift', '3'], action: 'UnixPlace' },
  { keys: ['Ctrl', 'Shift', '4'], action: 'Настройки' },
]

/** Whether the hotkeys are registered with Windows. */
function registrationSummary(enabled: boolean, security: SecurityStatus | null): string {
  if (!enabled) return 'сочетания выключены'
  if (security?.globalHotkeys) {
    return `${security.registeredHotkeys} из ${security.expectedHotkeys} сочетаний зарегистрированы`
  }
  return 'не удалось зарегистрировать сочетания'
}

/** Names the combinations another program already holds; empty when there are none. */
function unavailableSuffix(security: SecurityStatus | null): string {
  const unavailable = security?.unavailableHotkeys
  return unavailable?.length ? ` · заняты: ${unavailable.join(', ')}` : ''
}

type HotkeysSectionProps = {
  prefs: Preferences
  /** `null` in the browser preview and until the first status arrives. */
  security: SecurityStatus | null
  onChange: UpdatePreference
}

export function HotkeysSection({ prefs, security, onChange }: HotkeysSectionProps) {
  return (
    <SettingsSection
      icon={Keyboard}
      title="Горячие клавиши"
      description="работают, даже когда клиент свёрнут в трей"
    >
      <Toggle
        checked={prefs.globalHotkeys}
        label="Глобальные сочетания"
        note="можно выключить одним переключателем"
        onChange={(value) => onChange('globalHotkeys', value)}
      />
      <div className="shortcut-list" aria-label="Сочетания клавиш">
        {SHORTCUTS.map(({ keys, action }) => (
          <span key={action}>
            {keys.map((key) => (
              <kbd key={key}>{key}</kbd>
            ))}
            <b>{action}</b>
          </span>
        ))}
      </div>
      <p className="shortcut-status" aria-live="polite">
        {/* Two expressions, hence two text nodes: joining them changes how the line is rasterised. */}
        {registrationSummary(prefs.globalHotkeys, security)}
        {unavailableSuffix(security)}
      </p>
      <p className="shortcut-legacy">Ctrl + Alt + U/M/G/S сохранены как дополнительные сочетания.</p>
    </SettingsSection>
  )
}
