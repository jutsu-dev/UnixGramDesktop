import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Expand, Gamepad2, MessageCircle, Monitor, Palette, Save, Sparkles } from 'lucide-react'
import './SettingsApp.css'

type Preferences = {
  theme: string
  liquidGlass: boolean
  glassStrength: number
  compactChats: boolean
  largeChatText: boolean
  reduceMotion: boolean
  fullscreen: boolean
  alwaysOnTop: boolean
  zoom: number
  discordPresence: boolean
  discordShowSection: boolean
}

const fallback: Preferences = {
  theme: 'native', liquidGlass: false, glassStrength: 0.72, compactChats: false, largeChatText: false,
  reduceMotion: false, fullscreen: false, alwaysOnTop: false, zoom: 1,
  discordPresence: false, discordShowSection: false,
}

const themes = [
  ['native', 'UnixGram', '#6e5fe4', 'без изменений'],
  ['midnight', 'Midnight', '#8b7cff', 'сине-чёрная'],
  ['oled', 'OLED', '#000000', 'чистый чёрный'],
  ['graphite', 'Graphite', '#8d96a8', 'серая'],
  ['aurora', 'Aurora', '#45d6ad', 'зелёная'],
  ['light', 'Daylight', '#8aa4ff', 'светлый графит'],
  ['lucifer', 'Lucifer', '#d44a62', 'в честь @Lucifer'],
  ['basaltes', 'by basaltes', '#9d67ff', 'авторская'],
  ['honey', 'Soft Honey', '#d6ad4a', 'тёплая жёлтая'],
] as const

function Toggle({ checked, label, note, onChange }: { checked: boolean; label: string; note: string; onChange: (value: boolean) => void }) {
  return <label className="setting-row"><span><strong>{label}</strong><small>{note}</small></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><i /></label>
}

export default function SettingsApp() {
  const isDesktopRuntime = '__TAURI_INTERNALS__' in window
  const [prefs, setPrefs] = useState<Preferences>(fallback)
  const [status, setStatus] = useState('')
  useEffect(() => {
    void invoke<Preferences>('desktop_preferences')
      .then(setPrefs)
      .catch(() => setStatus('предпросмотр · настройки не сохранены'))
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
  const save = async () => {
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
    }
    catch { setStatus('не удалось применить') }
  }
  return <main className="settings-app" tabIndex={-1} autoFocus>
    <header><div className="settings-logo"><Sparkles size={18} /></div><div><span>UNIXGRAM DESKTOP</span><h1>Настройки</h1></div><button disabled={!isDesktopRuntime} onClick={() => void save()}><Save size={16} /> {isDesktopRuntime ? 'Применить' : 'Предпросмотр'}</button></header>

    <section><div className="section-title"><Palette size={19} /><div><h2>Оформление</h2></div></div>
      <div className="theme-grid">{themes.map(([id, title, color, note]) => <button key={id} className={prefs.theme === id ? 'theme-card active' : 'theme-card'} onClick={() => update('theme', id)}><i style={{ background: color }} /><span><strong>{title}</strong><small>{note}</small></span><b /></button>)}</div>
      <Toggle checked={prefs.liquidGlass} label="Liquid Glass" note="прозрачные панели и размытие" onChange={(value) => update('liquidGlass', value)} />
      {prefs.liquidGlass && <label className="zoom-row glass-strength"><span><Sparkles size={17} /><strong>Прозрачность</strong></span><input type="range" min="0.58" max="0.90" step="0.01" value={prefs.glassStrength} onChange={(event) => update('glassStrength', Number(event.target.value))} /><b>{Math.round((1 - prefs.glassStrength) * 100)}%</b></label>}
    </section>

    <section><div className="section-title"><MessageCircle size={19} /><div><h2>Чаты</h2></div></div>
      <Toggle checked={prefs.compactChats} label="Компактный список" note="строки диалогов ниже" onChange={(value) => update('compactChats', value)} />
      <Toggle checked={prefs.largeChatText} label="Крупный текст" note="сообщения легче читать" onChange={(value) => update('largeChatText', value)} />
      <Toggle checked={prefs.reduceMotion} label="Меньше анимаций" note="без плавных переходов" onChange={(value) => update('reduceMotion', value)} />
    </section>

    <section><div className="section-title"><Monitor size={19} /><div><h2>Окно</h2></div></div>
      <Toggle checked={prefs.fullscreen} label="Полный экран" note="без рамок, на весь экран" onChange={(value) => update('fullscreen', value)} />
      <Toggle checked={prefs.alwaysOnTop} label="Поверх остальных окон" note="окно всегда видно" onChange={(value) => update('alwaysOnTop', value)} />
      <label className="zoom-row"><span><Expand size={17} /><strong>Масштаб</strong></span><input type="range" min="0.8" max="1.4" step="0.05" value={prefs.zoom} onChange={(event) => update('zoom', Number(event.target.value))} /><b>{Math.round(prefs.zoom * 100)}%</b></label>
    </section>
    <section><div className="section-title"><Gamepad2 size={19} /><div><h2>Discord</h2><p>показывает использование UnixGram без личных данных</p></div></div>
      <Toggle checked={prefs.discordPresence} label="Rich Presence" note="включается только по вашему выбору и работает в трее" onChange={(value) => update('discordPresence', value)} />
      <Toggle checked={prefs.discordShowSection} label="Название раздела" note="показывать только общий раздел без сообщений и имён" onChange={(value) => update('discordShowSection', value)} />
    </section>
    <footer><span>{status}</span><button disabled={!isDesktopRuntime} onClick={() => void save()}><Save size={16} /> {isDesktopRuntime ? 'Сохранить и применить' : 'Сохранение доступно в приложении'}</button></footer>
  </main>
}
