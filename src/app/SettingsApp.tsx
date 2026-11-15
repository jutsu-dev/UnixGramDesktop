import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { ApplyButton } from '../features/settings/components/ApplyButton'
import { glassAttribute } from '../features/settings/glass'
import { useAccountActions } from '../features/settings/hooks/useAccountActions'
import { useDesktopActions } from '../features/settings/hooks/useDesktopActions'
import { useKeyboardScrolling } from '../features/settings/hooks/useKeyboardScrolling'
import { usePreferences } from '../features/settings/hooks/usePreferences'
import { useSecurityStatus } from '../features/settings/hooks/useSecurityStatus'
import { useSettingsPalette } from '../features/settings/hooks/useSettingsPalette'
import { AccountsSection } from '../features/settings/sections/AccountsSection'
import { AppearanceSection } from '../features/settings/sections/AppearanceSection'
import { ChatsSection } from '../features/settings/sections/ChatsSection'
import { DevicesSection } from '../features/settings/sections/DevicesSection'
import { DiscordSection } from '../features/settings/sections/DiscordSection'
import { HotkeysSection } from '../features/settings/sections/HotkeysSection'
import { SecuritySection } from '../features/settings/sections/SecuritySection'
import { SystemSection } from '../features/settings/sections/SystemSection'
import { WindowSection } from '../features/settings/sections/WindowSection'
import { isDesktopRuntime as detectDesktopRuntime } from '../shared/ipc'
import '../styles/settings.css'

/**
 * The settings window: the only page the desktop shell bundles.
 *
 * Edits change a local draft and are previewed immediately; they reach the Rust process only when
 * "apply" is pressed. In a plain browser the page still renders as a read-only preview.
 */
export default function SettingsApp() {
  const isDesktopRuntime = detectDesktopRuntime()
  const [status, setStatus] = useState('')

  const { prefs, setPrefs, update, save, saving } = usePreferences({
    setStatus,
    onSaved: () => refreshSecurity(),
  })
  const { security, refresh: refreshSecurity } = useSecurityStatus()
  const accounts = useAccountActions({ saving, setPrefs, setStatus, onChanged: refreshSecurity })
  const { openCreator, openDeviceSettings } = useDesktopActions({ setStatus })
  const { style, panelOpacity } = useSettingsPalette(prefs)
  useKeyboardScrolling('.settings-app')

  const applyButton = (
    <ApplyButton
      isDesktopRuntime={isDesktopRuntime}
      busy={saving || accounts.busy}
      onApply={() => void save()}
    />
  )

  return (
    <main
      className="settings-app"
      style={style}
      data-theme={prefs.theme}
      data-glass={glassAttribute(prefs)}
      data-motion={prefs.reduceMotion ? 'reduce' : 'normal'}
      tabIndex={-1}
      autoFocus
    >
      <header>
        <div className="settings-logo">
          <Sparkles size={18} />
        </div>
        <div>
          <span>UNIXGRAM DESKTOP</span>
          <h1>Настройки</h1>
        </div>
        {applyButton}
      </header>

      <AccountsSection
        accounts={prefs.accounts}
        activeAccount={prefs.activeAccount}
        isDesktopRuntime={isDesktopRuntime}
        newLabel={accounts.label}
        onNewLabelChange={accounts.setLabel}
        onAdd={() => void accounts.add()}
        onSwitch={(id) => void accounts.switchTo(id)}
        onRemove={(id) => void accounts.remove(id)}
        onOpenCreatorProfile={openCreator}
      />
      <AppearanceSection prefs={prefs} panelOpacity={panelOpacity} onChange={update} />
      <ChatsSection prefs={prefs} onChange={update} />
      <WindowSection prefs={prefs} onChange={update} />
      <SystemSection prefs={prefs} onChange={update} />
      <HotkeysSection prefs={prefs} security={security} onChange={update} />
      <DiscordSection prefs={prefs} onChange={update} />
      <DevicesSection isDesktopRuntime={isDesktopRuntime} onOpenDeviceSettings={openDeviceSettings} />
      <SecuritySection security={security} />

      <footer>
        <span role="status">{status}</span>
        {applyButton}
      </footer>
    </main>
  )
}
