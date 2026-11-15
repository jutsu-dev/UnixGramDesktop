import { BellRing, LockKeyhole, ShieldCheck, Wifi } from 'lucide-react'
import type { SecurityStatus } from '../../../shared/ipc'
import { SettingsSection } from '../components/SettingsSection'

/** Shown for values that are unknown until the Rust process reports them. */
const UNKNOWN = '—'

type SecuritySectionProps = {
  /** `null` in the browser preview and until the first status arrives. */
  security: SecurityStatus | null
}

export function SecuritySection({ security }: SecuritySectionProps) {
  return (
    <SettingsSection
      icon={ShieldCheck}
      title="Центр безопасности"
      description="что хранится локально и какие возможности включены"
    >
      <div className="security-grid" aria-live="polite">
        <span>
          <Wifi size={17} />
          <b>Соединение</b>
          <strong>{security?.online ? 'доступно' : 'проверяется'}</strong>
        </span>
        <span>
          <LockKeyhole size={17} />
          <b>Сессии</b>
          <strong>{security ? `${security.isolatedAccounts}/${security.maxAccounts}` : UNKNOWN}</strong>
        </span>
        <span>
          <ShieldCheck size={17} />
          <b>Ссылки</b>
          <strong>{security?.httpsOnly ? 'только HTTPS' : UNKNOWN}</strong>
        </span>
        <span>
          <BellRing size={17} />
          <b>Превью</b>
          <strong>{security?.notificationsPrivate ? 'скрыты' : UNKNOWN}</strong>
        </span>
      </div>
      <div className="security-details">
        <p>
          <b>Разрешённые сайты</b>
          <span>{security?.trustedHosts.join(', ') ?? 'unixgram.com, place.unixgram.com'}</span>
        </p>
        <p>
          <b>Хранилище</b>
          <span>{security?.sessionStorage ?? 'изолированные профили WebView2'}</span>
        </p>
        <p>
          <b>Версия</b>
          <span>{security?.version ?? 'Предпросмотр'}</span>
        </p>
      </div>
    </SettingsSection>
  )
}
