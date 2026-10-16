import { useEffect, useState, type CSSProperties } from 'react'
import { invoke, isTauri } from '@tauri-apps/api/core'
import { BellRing, Expand, Gamepad2, Keyboard, LockKeyhole, MessageCircle, Monitor, Palette, Save, ShieldCheck, Sparkles, Trash2, UserPlus, Users, Wifi, Phone } from 'lucide-react'
import './SettingsApp.css'

type Preferences = {
  theme: string
  liquidGlass: boolean
  glassStrength: number
  glassMode: 'frosted' | 'clear'
  reduceTransparency: boolean
  compactChats: boolean
  largeChatText: boolean
  reduceMotion: boolean
  smoothScroll: boolean
  underlineLinks: boolean
  fullscreen: boolean
  alwaysOnTop: boolean
  zoom: number
  discordPresence: boolean
  discordShowSection: boolean
  trayUnreadBadge: boolean
  windowsNotifications: boolean
  reconnectEnabled: boolean
  globalHotkeys: boolean
  activeAccount: number
  accounts: AccountProfile[]
}

type AccountProfile = { id: number; label: string }
type SecurityStatus = {
  httpsOnly: boolean
  trustedHosts: string[]
  sessionStorage: string
  isolatedAccounts: number
  maxAccounts: number
  online: boolean
  notificationsPrivate: boolean
  discordPrivate: boolean
  globalHotkeys: boolean
  registeredHotkeys: number
  expectedHotkeys: number
  unavailableHotkeys: string[]
  version: string
}

const fallback: Preferences = {
  theme: 'native', liquidGlass: false, glassStrength: 0.72, compactChats: false, largeChatText: false,
  glassMode: 'frosted', reduceTransparency: false,
  reduceMotion: false, fullscreen: false, alwaysOnTop: false, zoom: 1,
  discordPresence: true, discordShowSection: false, smoothScroll: false, underlineLinks: false,
  trayUnreadBadge: true, windowsNotifications: true, reconnectEnabled: true, globalHotkeys: true,
  activeAccount: 1, accounts: [{ id: 1, label: 'Основной' }],
}

const themes = [
  ['native', 'UnixGram', '#6e5fe4', 'без изменений'],
  ['midnight', 'Midnight', '#a097ff', 'сине-чёрная'],
  ['oled', 'OLED', '#000000', 'чистый чёрный'],
  ['graphite', 'Graphite', '#b3bdce', 'серая'],
  ['aurora', 'Aurora', '#71dab5', 'зелёная'],
  ['light', 'Daylight', '#5948c7', 'светлая'],
  ['lucifer', 'Lucifer', '#e78a9d', 'в честь @Lucifer'],
  ['basaltes', 'by basaltes', '#bb97ff', 'фиолетово-чёрная'],
  ['honey', 'Soft Honey', '#dfc171', 'тёплая жёлтая'],
  ['ocean', 'Ocean', '#79c8ec', 'морская синяя'],
  ['rose', 'Rose', '#e9a4c2', 'дымчатая розовая'],
  ['forest', 'Forest', '#b7cc8c', 'хвойная зелёная'],
  ['mexican-pink', 'Mexican Pink', '#e4007c', 'в честь @cekc'],
] as const

const surfaces: Record<string, [string, string, string]> = {
  native: ['#08090d', '#15151c', '#f4f5fa'], midnight: ['#0a0e1a', '#151d30', '#edf0ff'],
  oled: ['#000000', '#0b0b0e', '#ffffff'], graphite: ['#121416', '#202328', '#f4f5f7'],
  aurora: ['#091612', '#142820', '#effffb'], light: ['#f1f2f5', '#ffffff', '#191b24'],
  lucifer: ['#10080b', '#241018', '#fff1f3'], basaltes: ['#08050e', '#191023', '#f7efff'],
  honey: ['#15120b', '#272115', '#fff8e6'], ocean: ['#08131c', '#112635', '#ecf8ff'],
  rose: ['#180f17', '#2c1c29', '#fff1f8'], forest: ['#11160f', '#212b1b', '#f1f7e9'],
  'mexican-pink': ['#140911', '#28121f', '#fff3f9'],
}

function Toggle({ checked, label, note, onChange }: { checked: boolean; label: string; note?: string; onChange: (value: boolean) => void }) {
  return <label className="setting-row"><span><strong>{label}</strong>{note && <small>{note}</small>}</span><input type="checkbox" aria-label={label} checked={checked} onChange={(event) => onChange(event.target.checked)} /><i /></label>
}

export default function SettingsApp() {
  const isDesktopRuntime = isTauri()
  const [prefs, setPrefs] = useState<Preferences>(fallback)
  const [status, setStatus] = useState('')
  const [security, setSecurity] = useState<SecurityStatus | null>(null)
  const [accountLabel, setAccountLabel] = useState('')
  const [accountBusy, setAccountBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    document.documentElement.style.setProperty('--settings-page-bg', (surfaces[prefs.theme] ?? surfaces.native)[0])
    return () => { document.documentElement.style.removeProperty('--settings-page-bg') }
  }, [prefs.theme])
  useEffect(() => {
    void invoke<Preferences>('desktop_preferences')
      .then((loaded) => setPrefs({ ...fallback, ...loaded }))
      .catch(() => setStatus('предпросмотр · настройки не сохранены'))
    void invoke<SecurityStatus>('desktop_security_status').then(setSecurity).catch(() => undefined)
  }, [])
  useEffect(() => {
    const scrollWithKeyboard = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return
      const scroller = document.querySelector<HTMLElement>('.settings-app')
      if (!scroller) return
      if (event.key === 'End') scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'auto' })
      else if (event.key === 'Home') scroller.scrollTo({ top: 0, behavior: 'auto' })
      else if (event.key === 'PageDown') scroller.scrollBy({ top: scroller.clientHeight * 0.8, behavior: 'auto' })
      else if (event.key === 'PageUp') scroller.scrollBy({ top: scroller.clientHeight * -0.8, behavior: 'auto' })
      else return
      event.preventDefault()
    }
    window.addEventListener('keydown', scrollWithKeyboard)
    return () => window.removeEventListener('keydown', scrollWithKeyboard)
  }, [])
  const update = <K extends keyof Preferences>(key: K, value: Preferences[K]) => setPrefs((current) => ({ ...current, [key]: value }))
  const refreshSecurity = () => void invoke<SecurityStatus>('desktop_security_status').then(setSecurity).catch(() => undefined)
  const save = async () => {
    if (saving) return
    setSaving(true)
    setStatus('сохраняем…')
    try {
      const saved = await invoke<Preferences>('desktop_save_preferences', { preferences: prefs })
      setPrefs(saved)
      const rpc = await invoke<string>('discord_presence', {
        enabled: saved.discordPresence,
        clientId: '1540399183276539904',
        section: 'UnixGram',
        showSection: saved.discordShowSection,
      }).catch((error) => String(error))
      setStatus(saved.discordPresence ? `применено · Discord: ${rpc}` : 'применено')
      refreshSecurity()
    }
    catch { setStatus('не удалось применить') }
    finally { setSaving(false) }
  }
  const addAccount = async () => {
    if (accountBusy || saving) return
    setAccountBusy(true)
    setStatus('создаём изолированный профиль…')
    try {
      const saved = await invoke<Preferences>('desktop_add_account', { label: accountLabel })
      setPrefs(current => ({ ...current, accounts: saved.accounts, activeAccount: saved.activeAccount }))
      setAccountLabel('')
      setStatus('аккаунт добавлен · войдите в открывшемся окне')
      refreshSecurity()
    } catch (error) { setStatus(String(error)) }
    finally { setAccountBusy(false) }
  }
  const switchAccount = async (id: number) => {
    if (accountBusy || saving) return
    setAccountBusy(true)
    try {
      const saved = await invoke<Preferences>('desktop_switch_account', { id })
      setPrefs(current => ({ ...current, accounts: saved.accounts, activeAccount: saved.activeAccount }))
      setStatus(`активен профиль ${id}`)
      refreshSecurity()
    } catch (error) { setStatus(String(error)) }
    finally { setAccountBusy(false) }
  }
  const removeAccount = async (id: number) => {
    if (accountBusy || saving) return
    const prompt = id === 1
      ? 'Сбросить вход основного аккаунта? Локальные cookie и сохранённая сессия будут удалены.'
      : 'Удалить локальную сессию и изолированный профиль этого аккаунта с компьютера?'
    if (!window.confirm(prompt)) return
    setAccountBusy(true)
    try {
      const saved = await invoke<Preferences>('desktop_remove_account', { id })
      setPrefs(current => ({ ...current, accounts: saved.accounts, activeAccount: saved.activeAccount }))
      setStatus(id === 1 ? 'вход основного аккаунта сброшен' : 'локальная сессия удалена')
      refreshSecurity()
    } catch (error) { setStatus(String(error)) }
    finally { setAccountBusy(false) }
  }
  const palette = surfaces[prefs.theme] ?? surfaces.native
  const accent = prefs.theme === 'oled' ? '#a397ff' : themes.find(theme => theme[0] === prefs.theme)?.[2] ?? '#6e5fe4'
  const panelOpacity = Math.max(prefs.glassStrength, prefs.glassMode === 'clear' ? .70 : .88)
  const colors = { '--settings-bg': palette[0], '--settings-panel': palette[1], '--settings-text': palette[2], '--settings-accent': accent, '--settings-opacity': `${Math.round(panelOpacity * 100)}%` } as CSSProperties
  return <main className="settings-app" style={colors} data-theme={prefs.theme} data-glass={prefs.liquidGlass && !prefs.reduceTransparency ? prefs.glassMode : 'off'} data-motion={prefs.reduceMotion ? 'reduce' : 'normal'} tabIndex={-1} autoFocus>
    <header><div className="settings-logo"><Sparkles size={18} /></div><div><span>UNIXGRAM DESKTOP</span><h1>Настройки</h1></div><button disabled={!isDesktopRuntime || saving || accountBusy} onClick={() => void save()}><Save size={16} /> {isDesktopRuntime ? 'Применить' : 'Предпросмотр'}</button></header>

    <section><div className="section-title"><Users size={19} /><div><h2>Аккаунты</h2><p>До трёх аккаунтов</p></div></div>
      <div className="account-list" aria-label="Подключённые аккаунты">
        {prefs.accounts.map((account) => <article className={prefs.activeAccount === account.id ? 'account-card is-active' : 'account-card'} key={account.id}>
          <span className="account-avatar">{account.id}</span><span><strong>{account.label}</strong><small>{account.id === 1 ? 'Основной' : 'Дополнительный'}</small></span>
          <button type="button" disabled={!isDesktopRuntime || prefs.activeAccount === account.id} onClick={() => void switchAccount(account.id)}>{prefs.activeAccount === account.id ? 'Активен' : 'Открыть'}</button>
          <button className="icon-danger" type="button" disabled={!isDesktopRuntime} aria-label={account.id === 1 ? 'Сменить основной аккаунт' : `Удалить ${account.label}`} title={account.id === 1 ? 'Сменить аккаунт' : 'Удалить аккаунт'} onClick={() => void removeAccount(account.id)}><Trash2 size={16} /></button>
        </article>)}
      </div>
      {prefs.accounts.length < 3 && <div className="account-add"><label htmlFor="account-label"><span>Название профиля</span><input id="account-label" maxLength={32} value={accountLabel} placeholder={`Аккаунт ${prefs.accounts.length + 1}`} onChange={(event) => setAccountLabel(event.target.value)} /></label><button type="button" onClick={() => void addAccount()} disabled={!isDesktopRuntime}><UserPlus size={16} /> Добавить</button></div>}
      <div className="creator-follow"><span><strong>Новости разработки</strong><small>подписка выполняется только после вашего нажатия в UnixGram</small></span><button type="button" disabled={!isDesktopRuntime} onClick={() => void invoke('desktop_open_creator_profile').then(() => setStatus('открыт профиль @basaltes')).catch((error) => setStatus(String(error)))}><UserPlus size={16} /> Читать @basaltes</button></div>
      <p className="privacy-note"><LockKeyhole size={15} /> cookie и пароли не записываются в настройки и не попадают в установщик.</p>
    </section>

    <section><div className="section-title"><Palette size={19} /><div><h2>Оформление</h2></div></div>
      <div className="theme-grid">{themes.map(([id, title, color, note]) => <button key={id} className={prefs.theme === id ? 'theme-card active' : 'theme-card'} onClick={() => update('theme', id)}><i style={{ background: color }} /><span><strong>{title}</strong><small>{note}</small></span><b /></button>)}</div>
      <Toggle checked={prefs.liquidGlass} label="Liquid Glass" note="прозрачные панели и размытие" onChange={(value) => update('liquidGlass', value)} />
      {prefs.liquidGlass && <div className="glass-modes" role="group" aria-label="Вид стекла">{([['frosted', 'Матовое'], ['clear', 'Прозрачное']] as const).map(([mode, label]) => <button key={mode} type="button" aria-pressed={prefs.glassMode === mode} onClick={() => update('glassMode', mode)}>{label}</button>)}</div>}
      {prefs.liquidGlass && <label className="zoom-row glass-strength"><span><Sparkles size={17} /><strong>Прозрачность</strong></span><input aria-label="Прозрачность панелей" disabled={prefs.reduceTransparency} type="range" min={prefs.glassMode === 'clear' ? '0.70' : '0.88'} max="0.90" step="0.01" value={panelOpacity} onChange={(event) => update('glassStrength', Number(event.target.value))} /><b>{prefs.reduceTransparency ? 0 : Math.round((1 - panelOpacity) * 100)}%</b></label>}
      <Toggle checked={prefs.reduceTransparency} label="Без прозрачности" note="Плотные панели во всех темах" onChange={(value) => update('reduceTransparency', value)} />
    </section>

    <section><div className="section-title"><MessageCircle size={19} /><div><h2>Чаты</h2></div></div>
      <Toggle checked={prefs.compactChats} label="Компактный текст" onChange={(value) => update('compactChats', value)} />
      <Toggle checked={prefs.largeChatText} label="Крупный текст" onChange={(value) => update('largeChatText', value)} />
      <Toggle checked={prefs.reduceMotion} label="Меньше анимаций" onChange={(value) => update('reduceMotion', value)} />
      <Toggle checked={prefs.smoothScroll} label="Плавная прокрутка" note="При переходе к элементам. Не меняет прокрутку колёсиком." onChange={(value) => update('smoothScroll', value)} />
      <Toggle checked={prefs.underlineLinks} label="Подчёркивать ссылки" onChange={(value) => update('underlineLinks', value)} />
    </section>

    <section><div className="section-title"><Monitor size={19} /><div><h2>Окно</h2></div></div>
      <Toggle checked={prefs.fullscreen} label="Полный экран" onChange={(value) => update('fullscreen', value)} />
      <Toggle checked={prefs.alwaysOnTop} label="Поверх остальных окон" onChange={(value) => update('alwaysOnTop', value)} />
      <label className="zoom-row"><span><Expand size={17} /><strong>Масштаб</strong></span><input type="range" min="0.8" max="1.4" step="0.05" value={prefs.zoom} onChange={(event) => update('zoom', Number(event.target.value))} /><b>{Math.round(prefs.zoom * 100)}%</b></label>
    </section>
    <section><div className="section-title"><BellRing size={19} /><div><h2>Система</h2><p>трей, Центр уведомлений Windows и восстановление сети</p></div></div>
      <Toggle checked={prefs.trayUnreadBadge} label="Счётчик в трее" onChange={(value) => update('trayUnreadBadge', value)} />
      <Toggle checked={prefs.windowsNotifications} label="Уведомления Windows" note="Без текста сообщений и имён" onChange={(value) => update('windowsNotifications', value)} />
      <Toggle checked={prefs.reconnectEnabled} label="Переподключаться при обрыве" onChange={(value) => update('reconnectEnabled', value)} />
    </section>
    <section><div className="section-title"><Keyboard size={19} /><div><h2>Горячие клавиши</h2><p>работают, даже когда клиент свёрнут в трей</p></div></div>
      <Toggle checked={prefs.globalHotkeys} label="Глобальные сочетания" note="можно выключить одним переключателем" onChange={(value) => update('globalHotkeys', value)} />
      <div className="shortcut-list" aria-label="Сочетания клавиш"><span><kbd>Ctrl</kbd><kbd>Shift</kbd><kbd>1</kbd><b>Открыть UnixGram</b></span><span><kbd>Ctrl</kbd><kbd>Shift</kbd><kbd>2</kbd><b>Сообщения</b></span><span><kbd>Ctrl</kbd><kbd>Shift</kbd><kbd>3</kbd><b>UnixPlace</b></span><span><kbd>Ctrl</kbd><kbd>Shift</kbd><kbd>4</kbd><b>Настройки</b></span></div>
      <p className="shortcut-status" aria-live="polite">{!prefs.globalHotkeys ? 'сочетания выключены' : security?.globalHotkeys ? `${security.registeredHotkeys} из ${security.expectedHotkeys} сочетаний зарегистрированы` : 'не удалось зарегистрировать сочетания'}{security?.unavailableHotkeys?.length ? ` · заняты: ${security.unavailableHotkeys.join(', ')}` : ''}</p>
      <p className="shortcut-legacy">Ctrl + Alt + U/M/G/S сохранены как дополнительные сочетания.</p>
    </section>
    <section><div className="section-title"><Gamepad2 size={19} /><div><h2>Discord</h2><p>показывает использование UnixGram без личных данных</p></div></div>
      <Toggle checked={prefs.discordPresence} label="Показывать в Discord" note="Подключается при запуске. Discord должен быть открыт." onChange={(value) => update('discordPresence', value)} />
      <Toggle checked={prefs.discordShowSection} label="Показывать раздел" note="Например, «Сообщения». Без имён и переписки." onChange={(value) => update('discordShowSection', value)} />
    </section>
    <section><div className="section-title"><Phone size={19} /><div><h2>Звонки и устройства</h2><p>Разрешение на камеру и микрофон запрашивает UnixGram при звонке.</p></div></div>
      <div className="device-actions">{([['microphone', 'Микрофон'], ['camera', 'Камера'], ['sound', 'Звук']] as const).map(([device, label]) => <button type="button" key={device} disabled={!isDesktopRuntime} onClick={() => void invoke('desktop_media_settings', { device }).then(() => setStatus('открыты настройки Windows')).catch(() => setStatus('не удалось открыть настройки Windows'))}>{label}</button>)}</div>
      <p className="privacy-note">Звонок не прерывается автоматической перезагрузкой при восстановлении сети.</p>
    </section>
    <section><div className="section-title"><ShieldCheck size={19} /><div><h2>Центр безопасности</h2><p>что хранится локально и какие возможности включены</p></div></div>
      <div className="security-grid" aria-live="polite"><span><Wifi size={17} /><b>Соединение</b><strong>{security?.online ? 'доступно' : 'проверяется'}</strong></span><span><LockKeyhole size={17} /><b>Сессии</b><strong>{security ? `${security.isolatedAccounts}/${security.maxAccounts}` : '—'}</strong></span><span><ShieldCheck size={17} /><b>Ссылки</b><strong>{security?.httpsOnly ? 'только HTTPS' : '—'}</strong></span><span><BellRing size={17} /><b>Превью</b><strong>{security?.notificationsPrivate ? 'скрыты' : '—'}</strong></span></div>
      <div className="security-details"><p><b>Разрешённые сайты</b><span>{security?.trustedHosts.join(', ') ?? 'unixgram.com, place.unixgram.com'}</span></p><p><b>Хранилище</b><span>{security?.sessionStorage ?? 'Windows Credential Manager'}</span></p><p><b>Версия</b><span>{security?.version ?? 'Предпросмотр'}</span></p></div>
    </section>
    <footer><span role="status">{status}</span><button disabled={!isDesktopRuntime || saving || accountBusy} onClick={() => void save()}><Save size={16} /> {isDesktopRuntime ? 'Применить' : 'Предпросмотр'}</button></footer>
  </main>
}
