import { MessageCircle } from 'lucide-react'
import type { Preferences } from '../../../shared/ipc'
import { SettingsSection } from '../components/SettingsSection'
import { Toggle } from '../components/Toggle'
import type { UpdatePreference } from '../hooks/usePreferences'

type ChatsSectionProps = {
  prefs: Preferences
  onChange: UpdatePreference
}

export function ChatsSection({ prefs, onChange }: ChatsSectionProps) {
  return (
    <SettingsSection icon={MessageCircle} title="Чаты">
      <Toggle
        checked={prefs.compactChats}
        label="Компактный текст"
        onChange={(value) => onChange('compactChats', value)}
      />
      <Toggle
        checked={prefs.largeChatText}
        label="Крупный текст"
        onChange={(value) => onChange('largeChatText', value)}
      />
      <Toggle
        checked={prefs.reduceMotion}
        label="Меньше анимаций"
        onChange={(value) => onChange('reduceMotion', value)}
      />
      <Toggle
        checked={prefs.smoothScroll}
        label="Плавная прокрутка"
        note="При переходе к элементам. Не меняет прокрутку колёсиком."
        onChange={(value) => onChange('smoothScroll', value)}
      />
      <Toggle
        checked={prefs.underlineLinks}
        label="Подчёркивать ссылки"
        onChange={(value) => onChange('underlineLinks', value)}
      />
    </SettingsSection>
  )
}
