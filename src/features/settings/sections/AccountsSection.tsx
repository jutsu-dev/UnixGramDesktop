import { LockKeyhole, Trash2, UserPlus, Users } from 'lucide-react'
import { MAX_ACCOUNTS, type AccountProfile } from '../../../shared/ipc'
import { SettingsSection } from '../components/SettingsSection'

const PRIMARY_ACCOUNT_ID = 1

type AccountsSectionProps = {
  accounts: AccountProfile[]
  activeAccount: number
  isDesktopRuntime: boolean
  /** Draft name of the profile about to be added. */
  newLabel: string
  onNewLabelChange: (label: string) => void
  onAdd: () => void
  onSwitch: (id: number) => void
  onRemove: (id: number) => void
  onOpenCreatorProfile: () => void
}

export function AccountsSection({
  accounts,
  activeAccount,
  isDesktopRuntime,
  newLabel,
  onNewLabelChange,
  onAdd,
  onSwitch,
  onRemove,
  onOpenCreatorProfile,
}: AccountsSectionProps) {
  return (
    <SettingsSection icon={Users} title="Аккаунты" description="До трёх аккаунтов">
      <div className="account-list" aria-label="Подключённые аккаунты">
        {accounts.map((account) => {
          const isActive = activeAccount === account.id
          const isPrimary = account.id === PRIMARY_ACCOUNT_ID
          return (
            <article className={isActive ? 'account-card is-active' : 'account-card'} key={account.id}>
              <span className="account-avatar">{account.id}</span>
              <span>
                <strong>{account.label}</strong>
                <small>{isPrimary ? 'Основной' : 'Дополнительный'}</small>
              </span>
              <button
                type="button"
                disabled={!isDesktopRuntime || isActive}
                onClick={() => onSwitch(account.id)}
              >
                {isActive ? 'Активен' : 'Открыть'}
              </button>
              <button
                className="icon-danger"
                type="button"
                disabled={!isDesktopRuntime}
                aria-label={isPrimary ? 'Сменить основной аккаунт' : `Удалить ${account.label}`}
                title={isPrimary ? 'Сменить аккаунт' : 'Удалить аккаунт'}
                onClick={() => onRemove(account.id)}
              >
                <Trash2 size={16} />
              </button>
            </article>
          )
        })}
      </div>

      {accounts.length < MAX_ACCOUNTS && (
        <div className="account-add">
          <label htmlFor="account-label">
            <span>Название профиля</span>
            <input
              id="account-label"
              maxLength={32}
              value={newLabel}
              placeholder={`Аккаунт ${accounts.length + 1}`}
              onChange={(event) => onNewLabelChange(event.target.value)}
            />
          </label>
          <button type="button" onClick={onAdd} disabled={!isDesktopRuntime}>
            <UserPlus size={16} /> Добавить
          </button>
        </div>
      )}

      <div className="creator-follow">
        <span>
          <strong>Новости разработки</strong>
          <small>подписка выполняется только после вашего нажатия в UnixGram</small>
        </span>
        <button type="button" disabled={!isDesktopRuntime} onClick={onOpenCreatorProfile}>
          <UserPlus size={16} /> Читать @basaltes
        </button>
      </div>

      <p className="privacy-note">
        <LockKeyhole size={15} /> cookie и пароли не записываются в настройки и не попадают в установщик.
      </p>
    </SettingsSection>
  )
}
