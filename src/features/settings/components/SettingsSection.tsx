import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

type SettingsSectionProps = {
  icon: LucideIcon
  title: string
  description?: string
  children: ReactNode
}

/** A settings card: icon, heading, optional description, then the section body. */
export function SettingsSection({ icon: Icon, title, description, children }: SettingsSectionProps) {
  return (
    <section>
      <div className="section-title">
        <Icon size={19} />
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}
