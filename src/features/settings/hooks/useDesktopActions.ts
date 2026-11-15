import { openCreatorProfile, openMediaSettings, type MediaDevice } from '../../../shared/ipc'

type UseDesktopActionsOptions = {
  setStatus: (message: string) => void
}

/** One-shot actions that leave the settings window: the creator's profile and Windows device settings. */
export function useDesktopActions({ setStatus }: UseDesktopActionsOptions) {
  const openCreator = () => {
    void openCreatorProfile()
      .then(() => setStatus('открыт профиль @basaltes'))
      .catch((error) => setStatus(String(error)))
  }

  const openDeviceSettings = (device: MediaDevice) => {
    void openMediaSettings(device)
      .then(() => setStatus('открыты настройки Windows'))
      .catch(() => setStatus('не удалось открыть настройки Windows'))
  }

  return { openCreator, openDeviceSettings }
}
