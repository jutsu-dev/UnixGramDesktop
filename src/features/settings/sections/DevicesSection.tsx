import { Phone } from 'lucide-react'
import type { MediaDevice } from '../../../shared/ipc'
import { SettingsSection } from '../components/SettingsSection'

const DEVICES: readonly { device: MediaDevice; label: string }[] = [
  { device: 'microphone', label: 'Микрофон' },
  { device: 'camera', label: 'Камера' },
  { device: 'sound', label: 'Звук' },
]

type DevicesSectionProps = {
  isDesktopRuntime: boolean
  /** Opens the matching page of Windows Settings. */
  onOpenDeviceSettings: (device: MediaDevice) => void
}

export function DevicesSection({ isDesktopRuntime, onOpenDeviceSettings }: DevicesSectionProps) {
  return (
    <SettingsSection
      icon={Phone}
      title="Звонки и устройства"
      description="Разрешение на камеру и микрофон запрашивает UnixGram при звонке."
    >
      <div className="device-actions">
        {DEVICES.map(({ device, label }) => (
          <button
            type="button"
            key={device}
            disabled={!isDesktopRuntime}
            onClick={() => onOpenDeviceSettings(device)}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="privacy-note">Звонок не прерывается автоматической перезагрузкой при восстановлении сети.</p>
    </SettingsSection>
  )
}
