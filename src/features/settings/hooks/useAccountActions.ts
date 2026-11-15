import { useState, type Dispatch, type SetStateAction } from 'react'
import { addAccount, removeAccount, switchAccount, type Preferences } from '../../../shared/ipc'

const PRIMARY_ACCOUNT_ID = 1

type UseAccountActionsOptions = {
  /** Account actions are ignored while preferences are being saved. */
  saving: boolean
  setPrefs: Dispatch<SetStateAction<Preferences>>
  setStatus: (message: string) => void
  /** Called after a successful action, when the security centre may show stale data. */
  onChanged: () => void
}

export type AccountActions = {
  /** Draft name of the profile about to be added. */
  label: string
  setLabel: (label: string) => void
  busy: boolean
  add: () => Promise<void>
  switchTo: (id: number) => Promise<void>
  remove: (id: number) => Promise<void>
}

/** Adding, opening and removing isolated account profiles. One action runs at a time. */
export function useAccountActions({ saving, setPrefs, setStatus, onChanged }: UseAccountActionsOptions): AccountActions {
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)

  // Account commands return the whole preferences object, but only the account fields are taken
  // from it so that unsaved edits elsewhere on the page survive.
  const applyAccounts = (saved: Preferences) => {
    setPrefs((current) => ({ ...current, accounts: saved.accounts, activeAccount: saved.activeAccount }))
  }

  const add = async () => {
    if (busy || saving) return
    setBusy(true)
    setStatus('создаём изолированный профиль…')
    try {
      applyAccounts(await addAccount(label))
      setLabel('')
      setStatus('аккаунт добавлен · войдите в открывшемся окне')
      onChanged()
    } catch (error) {
      setStatus(String(error))
    } finally {
      setBusy(false)
    }
  }

  const switchTo = async (id: number) => {
    if (busy || saving) return
    setBusy(true)
    try {
      applyAccounts(await switchAccount(id))
      setStatus(`активен профиль ${id}`)
      onChanged()
    } catch (error) {
      setStatus(String(error))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: number) => {
    if (busy || saving) return
    const isPrimary = id === PRIMARY_ACCOUNT_ID
    const question = isPrimary
      ? 'Сбросить вход основного аккаунта? Локальные cookie и сохранённая сессия будут удалены.'
      : 'Удалить локальную сессию и изолированный профиль этого аккаунта с компьютера?'
    if (!window.confirm(question)) return
    setBusy(true)
    try {
      applyAccounts(await removeAccount(id))
      setStatus(isPrimary ? 'вход основного аккаунта сброшен' : 'локальная сессия удалена')
      onChanged()
    } catch (error) {
      setStatus(String(error))
    } finally {
      setBusy(false)
    }
  }

  return { label, setLabel, busy, add, switchTo, remove }
}
