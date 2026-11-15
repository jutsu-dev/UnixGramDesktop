import { Gamepad2 } from 'lucide-react'
import type { Preferences } from '../../../shared/ipc'
import { SettingsSection } from '../components/SettingsSection'
import { Toggle } from '../components/Toggle'
import type { UpdatePreference } from '../hooks/usePreferences'

type DiscordSectionProps = {
  prefs: Preferences
  onChange: UpdatePreference
}

export function DiscordSection({ prefs, onChange }: DiscordSectionProps) {
  return (
    <SettingsSection
      icon={Gamepad2}
      title="Discord"
      description="показывает использование UnixGram без личных данных"
    >
      <Toggle
        checked={prefs.discordPresence}
        label="Показывать в Discord"
        note="Подключается при запуске. Discord должен быть открыт."
        onChange={(value) => onChange('discordPresence', value)}
      />
      <Toggle
        checked={prefs.discordShowSection}
        label="Показывать раздел"
        note="Например, «Сообщения». Без имён и переписки."
        onChange={(value) => onChange('discordShowSection', value)}
      />
    </SettingsSection>
  )
}
