import { BellRing } from 'lucide-react'
import type { Preferences } from '../../../shared/ipc'
import { SettingsSection } from '../components/SettingsSection'
import { Toggle } from '../components/Toggle'
import type { UpdatePreference } from '../hooks/usePreferences'

type SystemSectionProps = {
  prefs: Preferences
  onChange: UpdatePreference
}

export function SystemSection({ prefs, onChange }: SystemSectionProps) {
  return (
    <SettingsSection
      icon={BellRing}
      title="Система"
      description="трей, Центр уведомлений Windows и восстановление сети"
    >
      <Toggle
        checked={prefs.trayUnreadBadge}
        label="Счётчик в трее"
        onChange={(value) => onChange('trayUnreadBadge', value)}
      />
      <Toggle
        checked={prefs.windowsNotifications}
        label="Уведомления Windows"
        note="Без текста сообщений и имён"
        onChange={(value) => onChange('windowsNotifications', value)}
      />
      <Toggle
        checked={prefs.reconnectEnabled}
        label="Переподключаться при обрыве"
        onChange={(value) => onChange('reconnectEnabled', value)}
      />
    </SettingsSection>
  )
}
