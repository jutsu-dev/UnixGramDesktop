import {
  AppWindowMac,
  Bell,
  BellDot,
  ChartColumn,
  ChartColumnBig,
  Check,
  CheckCheck,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ChevronsUpDown,
  CornerUpLeft,
  Database,
  ExternalLink,
  Gift,
  Heart,
  House,
  Link2,
  ListFilter,
  MessageCircle,
  MessageCirclePlus,
  Mail,
  MessageSquareMore,
  MonitorCog,
  MoreHorizontal,
  Palette,
  PenLine,
  Paperclip,
  RefreshCw,
  Repeat2,
  Rocket,
  Search,
  Send,
  Settings2,
  Share2,
  ShoppingBag,
  Sparkles,
  Star,
  Trash2,
  UserRound,
  Users,
  Eye,
  X,
} from 'lucide-react'
import QRCode from 'qrcode'
import { createContext, startTransition, useCallback, useContext, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import './Messenger.css'
import './NativeDesktop.css'
import { themeCards, type ThemeId } from './app-data'

type ViewId =
  | 'feed'
  | 'search'
  | 'history'
  | 'messages'
  | 'people'
  | 'studio'
  | 'gifts'
  | 'profile'
  | 'premium'
  | 'settings'
type GiftMode = 'account' | 'market' | 'transfers' | 'top'
type HistoryMode = 'activity' | 'profiles' | 'status'
type SettingsSection =
  | 'session'
  | 'appearance'
  | 'interface'
  | 'notifications'
  | 'data'
  | 'window'
  | 'advanced'
  | 'integrations'
  | 'about'
type BootInfo = { channel: string; protocol: string; themes: number; status: string }
type SettingsState = {
  autoRefresh: boolean
  compact: boolean
  notifications: boolean
  largeText: boolean
  desktopToasts: boolean
  soundEffects: boolean
  bidAlerts: boolean
  transferAlerts: boolean
  purchaseAlerts: boolean
  keepRightPanel: boolean
  rememberSearch: boolean
  openLinksExternally: boolean
  checkUpdatesOnLaunch: boolean
  unifiedSearchBeta: boolean
  reducedMotion: boolean
  dataSaver: boolean
  discordPresence: boolean
  discordShowSection: boolean
  discordClientId: string
  fontScale: 'normal' | 'large' | 'xlarge'
  syncHandle: string
  requestTimeout: '8' | '12' | '20'
  retryCount: '1' | '2' | '3'
  launchTo: ViewId
  refreshRate: '30s' | '1m' | '5m'
  timelineRange: '24h' | '7d' | '30d'
  timeZoneMode: 'msk' | 'local'
  titlebarStyle: 'system' | 'clean'
}

type BooleanSettingKey = {
  [Key in keyof SettingsState]: SettingsState[Key] extends boolean ? Key : never
}[keyof SettingsState]

type ToneId = 'violet' | 'blue' | 'amber' | 'pink' | 'cyan' | 'green'

type EventRow = {
  id: string
  icon: string
  title: string
  actor: string
  target: string
  value: string
  time: string
  tone: ToneId
  kind: 'передача' | 'покупка' | 'ставка' | 'профиль' | 'уведомление'
  ageHours: number
  avatarUrl?: string
  verificationBadge?: string
}

type GiftRow = {
  id: string
  mark: string
  name: string
  owner: string
  price: string
  delta: string
  tone: ToneId
  imageUrl?: string
  listingCount?: number
  slug?: string
  serial?: number
  collection?: string
  model?: string
  background?: string
  pattern?: string
  rarity?: string
  isOnSale?: boolean
  listingId?: string
  valueStars?: number
  floorPriceStars?: number
  lastSaleStars?: number
  history?: GiftHistoryEntry[]
}

type GiftHistoryEntry = {
  id: string
  type: string
  from?: string
  to?: string
  priceStars?: number
  time: string
}

type ConversationRow = {
  id: string
  title: string
  text: string
  time: string
  mark: string
  active?: boolean
  targetView?: ViewId
  avatarUrl?: string
  verificationBadge?: string
  unreadCount?: number
  type?: string
  isSelf?: boolean
  lastMessageId?: string
  lastMessageIsRead?: boolean
  username?: string
}

type ProfileWatchRow = {
  id: string
  name: string
  displayName?: string
  note: string
  activity: string
  gifts: string
  tone: ToneId
  avatarUrl?: string
  coverUrl?: string
  verificationBadge?: string
  premium?: boolean
  emojiStatus?: string
  memberCount?: number
}

type DesktopSections = {
  messages: unknown
  notifications: unknown
  communities: unknown
  activity: unknown
  giftCollections: unknown
  warnings?: string[]
}

type ChatMessage = {
  id: string
  content: string
  time: string
  mine: boolean
  senderName: string
  senderAvatar?: string
  mediaLabel?: string
  mediaUrl?: string
  mediaType?: string
  edited?: boolean
  read?: boolean
  reply?: { id: string; content: string; authorName: string }
  reactions: { emoji: string; count: number; reactedByViewer: boolean }[]
}

type GiftDetails = GiftRow & {
  ownerDisplayName?: string
  ownerAvatarUrl?: string
  valueStars?: number
  floorPriceStars?: number
  lastSaleStars?: number
  historyCount?: number
}

type ActivityRow = {
  id: string
  label: string
  detail: string
  time: string
  type: string
}

type SocialPost = {
  id: string
  username: string
  displayName: string
  avatarUrl?: string
  verificationBadge?: string
  premium?: boolean
  emojiStatus?: string
  text: string
  time: string
  createdAt?: string
  tone: ToneId
  verified?: boolean
  promoted?: boolean
  imageUrls: string[]
  videoUrl?: string
  gift?: { id?: string; title: string; imageUrl?: string; serial?: string }
  likes: number
  comments: number
  reposts: number
  views: number
}

type FeedPageInfo = { cursor: string | null; hasMore: boolean }
type PostImageDraft = { file: File; previewUrl: string }

type ProfileSummary = {
  watch: ProfileWatchRow
  bio: string
  postsCount?: number
  followersCount?: number
  profileViews?: number
  followingCount?: number
  giftCount?: number
  joinedAt?: string
  alternateUsernames?: string[]
}

type SessionInfo = {
  connected: boolean
  userId?: string | null
  username?: string | null
  storage: string
  message: string
}

type QrStart = { approvalUrl: string; status: string }

type SyncSnapshot = {
  profile: unknown
  gifts: unknown
  feed: unknown
  warnings?: string[]
  fetchedAtEpoch: number
}

const events: EventRow[] = [
  { id: 'e1', icon: 'A', title: 'Astral #104 передан', actor: 'mummy', target: 'basaltes', value: 'без продажи', time: '18:46', tone: 'violet', kind: 'передача', ageHours: 1 },
  { id: 'e2', icon: 'C', title: 'Crystal #018 куплен', actor: 'basaltes', target: 'mzkz', value: '16 500 stars', time: '18:42', tone: 'blue', kind: 'покупка', ageHours: 2 },
  { id: 'e3', icon: 'N', title: 'новая ставка на Crown #002', actor: 'nix', target: 'mummy', value: '1 240 000 stars', time: '18:39', tone: 'amber', kind: 'ставка', ageHours: 4 },
  { id: 'e4', icon: 'B', title: 'профиль basaltes обновлён', actor: 'basaltes', target: '', value: '3 новых подарка', time: '18:31', tone: 'pink', kind: 'профиль', ageHours: 8 },
  { id: 'e5', icon: 'P', title: 'Prism #009 передан', actor: 'mummy', target: 'nix', value: 'без продажи', time: '16:08', tone: 'green', kind: 'передача', ageHours: 58 },
  { id: 'e6', icon: 'K', title: 'Crown #002 выставлен', actor: 'nix', target: 'market', value: '980 000 stars', time: '12:14', tone: 'amber', kind: 'ставка', ageHours: 236 },
]

const fallbackPosts: SocialPost[] = [
  {
    id: 'post-1', username: 'mummy', displayName: 'mummy', time: '36 мин.', tone: 'violet',
    text: 'собираем desktop-клиент unixgram: лента, сообщения, подарки и инструменты в одном окне.',
    promoted: true, imageUrls: [], likes: 24, comments: 6, reposts: 3, views: 418,
  },
  {
    id: 'post-2', username: 'basaltes', displayName: 'basaltes', time: '1 ч.', tone: 'blue',
    text: 'проверяю новую коллекцию подарков. карточки открываются прямо из ленты, а профиль ведёт в unixgram.',
    imageUrls: [], gift: { id: 'preview-crystal-018', title: 'Crystal #018' }, likes: 18, comments: 4, reposts: 2, views: 267,
  },
  {
    id: 'post-3', username: 'mzkz', displayName: 'mzkz', time: '2 ч.', tone: 'pink',
    text: 'кто уже пробовал unixgram на компьютере? полезные идеи добавим в следующие сборки.',
    imageUrls: [], likes: 31, comments: 12, reposts: 5, views: 593,
  },
]

const gifts: GiftRow[] = [
  { id: 'g1', mark: 'A', name: 'Astral #104', owner: 'mummy', price: '24 800 stars', delta: '+12%', tone: 'violet' },
  { id: 'g2', mark: 'C', name: 'Crystal #018', owner: 'basaltes', price: '16 500 stars', delta: '+8%', tone: 'blue' },
  { id: 'g3', mark: 'K', name: 'Crown #002', owner: 'nix', price: '1 240 000 stars', delta: '+31%', tone: 'amber' },
  { id: 'g4', mark: 'N', name: 'Neon #071', owner: 'shadowfiend', price: '42 600 stars', delta: '+4%', tone: 'pink' },
  { id: 'g5', mark: 'C', name: 'Cube #211', owner: 'mzkz', price: '11 900 stars', delta: '-2%', tone: 'cyan' },
  { id: 'g6', mark: 'P', name: 'Prism #009', owner: 'mummy', price: '89 000 stars', delta: '+17%', tone: 'green' },
]

const conversations: ConversationRow[] = [
  { id: 'history', title: 'UnixGram | History', text: 'новая покупка: Crystal #018', time: '18:46', mark: 'UH', active: true, targetView: 'history' },
  { id: 'service', title: 'UnixGram', text: 'статус сервисов и API', time: '18:43', mark: 'UG', targetView: 'history' },
  { id: 'mzkz', title: 'mzkz', text: 'профиль обновлён', time: '18:31', mark: 'M', targetView: 'messages' },
  { id: 'market', title: 'Gift Market', text: '4 новых крупных лота', time: '18:24', mark: 'GM', targetView: 'gifts' },
  { id: 'daud', title: 'Daud naz', text: 'идея принята в обновление', time: '17:21', mark: 'DN', targetView: 'messages' },
  { id: 'news', title: 'Новости UnixGram', text: 'последние события сообщества', time: '16:50', mark: 'N', targetView: 'feed' },
]

const railItems = [
  { label: 'Лента', Icon: House, view: 'feed' as ViewId },
  { label: 'Поиск', Icon: Search, view: 'search' as ViewId },
  { label: 'Уведомления', Icon: Bell, view: 'history' as ViewId },
  { label: 'Сообщения', Icon: Mail, view: 'messages' as ViewId },
  { label: 'Сообщества', Icon: Users, view: 'people' as ViewId },
  { label: 'Студия', Icon: ChartColumn, view: 'studio' as ViewId },
  { label: 'Подарки', Icon: Gift, view: 'gifts' as ViewId },
  { label: 'Профиль', Icon: UserRound, view: 'profile' as ViewId },
  { label: 'Unix Premium', Icon: Star, view: 'premium' as ViewId },
]

const profileWatchRows: ProfileWatchRow[] = [
  { id: 'p1', name: 'basaltes', note: 'редкие покупки, перепродажи и заметные ставки', activity: '4 события за час', gifts: '24 подарка', tone: 'blue' },
  { id: 'p2', name: 'mummy', note: 'посты, передачи и активная коллекция', activity: '2 передачи', gifts: '18 подарков', tone: 'violet' },
  { id: 'p3', name: 'shadowfiend', note: 'дорогие аукционы и долгий холд', activity: '1 ставка 970k', gifts: '11 подарков', tone: 'pink' },
]

const settingsSections: { id: SettingsSection; label: string; Icon: typeof Palette }[] = [
  { id: 'session', label: 'Сессия UnixGram', Icon: UserRound },
  { id: 'appearance', label: 'Внешний вид', Icon: Palette },
  { id: 'interface', label: 'Интерфейс', Icon: ChartColumnBig },
  { id: 'notifications', label: 'Уведомления', Icon: BellDot },
  { id: 'data', label: 'Обновление данных', Icon: Database },
  { id: 'window', label: 'Окно и ссылки', Icon: AppWindowMac },
  { id: 'advanced', label: 'Возможности', Icon: Sparkles },
  { id: 'integrations', label: 'Discord', Icon: Link2 },
  { id: 'about', label: 'О приложении', Icon: MonitorCog },
]

const DEFAULT_DISCORD_CLIENT_ID = '1540399183276539904'
const settingsStorageKey = 'unixgram-desktop-settings-v4'
const themeStorageKey = 'unixgram-desktop-theme'
const previewSessionStorageKey = 'unixgram-desktop-preview-session'
const layoutStorageKey = 'unixgram-desktop-layout-v1'
const railExpandedStorageKey = 'unixgram-desktop-rail-expanded-v1'

const defaultSettings: SettingsState = {
  autoRefresh: true,
  compact: false,
  notifications: true,
  largeText: false,
  desktopToasts: true,
  soundEffects: false,
  bidAlerts: true,
  transferAlerts: true,
  purchaseAlerts: true,
  keepRightPanel: true,
  rememberSearch: true,
  openLinksExternally: true,
  checkUpdatesOnLaunch: true,
  unifiedSearchBeta: true,
  reducedMotion: false,
  dataSaver: false,
  discordPresence: false,
  discordShowSection: true,
  discordClientId: DEFAULT_DISCORD_CLIENT_ID,
  fontScale: 'normal',
  syncHandle: '',
  requestTimeout: '12',
  retryCount: '2',
  launchTo: 'feed',
  refreshRate: '1m',
  timelineRange: '24h',
  timeZoneMode: 'msk',
  titlebarStyle: 'clean',
}

function moveTabByArrow(event: React.KeyboardEvent<HTMLButtonElement>) {
  if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
  const tabs = Array.from(
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [],
  )
  const current = tabs.indexOf(event.currentTarget)
  if (current < 0 || tabs.length === 0) return
  event.preventDefault()
  const offset = event.key === 'ArrowRight' ? 1 : -1
  const next = tabs[(current + offset + tabs.length) % tabs.length]
  next.focus()
  next.click()
}

function moveRadioByArrow(event: React.KeyboardEvent<HTMLButtonElement>) {
  if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return
  const radios = Array.from(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]') ?? [])
  const current = radios.indexOf(event.currentTarget)
  if (current < 0 || radios.length === 0) return
  event.preventDefault()
  const nextIndex = event.key === 'Home'
    ? 0
    : event.key === 'End'
      ? radios.length - 1
      : (current + (event.key === 'ArrowRight' ? 1 : -1) + radios.length) % radios.length
  radios[nextIndex].focus()
  radios[nextIndex].click()
}

function PanelResizeHandle({
  className,
  label,
  value,
  min,
  max,
  direction = 1,
  onChange,
}: {
  className: string
  label: string
  value: number
  min: number
  max: number
  direction?: 1 | -1
  onChange: (value: number) => void
}) {
  const clamp = useCallback((next: number) => Math.min(max, Math.max(min, next)), [max, min])
  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const startX = event.clientX
    const startValue = value
    event.currentTarget.setPointerCapture(event.pointerId)
    const move = (moveEvent: PointerEvent) => onChange(clamp(startValue + ((moveEvent.clientX - startX) * direction)))
    const finish = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', finish)
      document.documentElement.classList.remove('is-resizing-layout')
    }
    document.documentElement.classList.add('is-resizing-layout')
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', finish, { once: true })
  }
  return (
    <div
      className={`panel-resizer ${className}`}
      role="separator"
      aria-label={label}
      aria-orientation="vertical"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      tabIndex={0}
      onPointerDown={startResize}
      onDoubleClick={() => onChange(Math.round((min + max) / 2))}
      onKeyDown={(event) => {
        if (event.key === 'Home') { event.preventDefault(); onChange(min); return }
        if (event.key === 'End') { event.preventDefault(); onChange(max); return }
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
        event.preventDefault()
        const delta = (event.key === 'ArrowRight' ? 12 : -12) * direction
        onChange(clamp(value + delta))
      }}
    ><span aria-hidden="true" /></div>
  )
}

const ExternalLinksContext = createContext(true)
type MediaViewerState = { urls: string[]; index: number; label: string } | null
const MediaViewerContext = createContext<(urls: string[], index?: number, label?: string) => void>(() => undefined)

function VerifiedBadge({ kind }: { kind?: string }) {
  if (!kind) return null
  return (
    <span className="verified-mark" title="Подлинная учётная запись" aria-label="Подлинная учётная запись">
      <Check size={10} strokeWidth={3.4} aria-hidden="true" />
    </span>
  )
}

function MediaLightbox({ state, onClose, onStep }: { state: MediaViewerState; onClose: () => void; onStep: (offset: number) => void }) {
  useEffect(() => {
    if (!state) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft') onStep(-1)
      if (event.key === 'ArrowRight') onStep(1)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, onStep, state])
  if (!state) return null
  const url = state.urls[state.index]
  return (
    <div className="media-lightbox" role="dialog" aria-modal="true" aria-label={state.label} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <header><span>{state.label}</span><small>{state.urls.length > 1 ? `${state.index + 1} / ${state.urls.length}` : ''}</small></header>
      <img src={url} alt={state.label} referrerPolicy="no-referrer" />
      {state.urls.length > 1 && <><button className="media-lightbox__prev" type="button" aria-label="Предыдущее фото" onClick={() => onStep(-1)}><ChevronLeftIcon size={28} /></button><button className="media-lightbox__next" type="button" aria-label="Следующее фото" onClick={() => onStep(1)}><ChevronRightIcon size={28} /></button></>}
      <button className="media-lightbox__close" type="button" aria-label="Закрыть фото" onClick={onClose}><X size={22} /></button>
      <SafeExternalLink className="media-lightbox__original" href={url}><ExternalLink size={16} /> открыть оригинал</SafeExternalLink>
    </div>
  )
}

function SafeExternalLink({ href, children, className, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const enabled = useContext(ExternalLinksContext)
  if (!enabled) return <span {...(props as React.HTMLAttributes<HTMLSpanElement>)} className={`${className ?? ''} is-link-disabled`.trim()} aria-disabled="true" title="Внешние ссылки выключены в настройках">{children}</span>
  return <a href={href} target="_blank" rel="noreferrer" className={className} {...props}>{children}</a>
}

function UnixLink({ username, children }: { username: string; children?: React.ReactNode }) {
  const clean = username.replace(/^@/, '')
  return (
    <SafeExternalLink className="unix-link" href={`https://unixgram.com/u/${clean}`}>
      {children ?? `@${clean}`}
    </SafeExternalLink>
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null
}

function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function listOrItems(value: unknown) {
  const direct = asList(value)
  return direct.length > 0 ? direct : asList(readValue(value, 'items'))
}

function readValue(source: unknown, ...keys: string[]) {
  const record = asRecord(source)
  if (!record) return undefined
  for (const key of keys) {
    const value = record[key]
    if (value !== undefined && value !== null) return value
  }
  return undefined
}

function readText(source: unknown, ...keys: string[]) {
  const value = readValue(source, ...keys)
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  return ''
}

function readNumber(source: unknown, ...keys: string[]) {
  const value = readValue(source, ...keys)
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const normalized = Number(value.replace(/[^\d.-]/g, ''))
    return Number.isFinite(normalized) ? normalized : undefined
  }
  if (Array.isArray(value)) return value.length
  return undefined
}

function unwrapPayload(value: unknown) {
  const root = asRecord(value)
  const data = asRecord(root?.data)
  return data ?? root
}

function normalizeHandle(value: string) {
  return value.replace(/^@/, '').trim()
}

function safeMediaUrl(value: unknown) {
  if (typeof value !== 'string' || value.length > 2_048) return ''
  try {
    const url = new URL(value, 'https://unixgram.com')
    if (url.protocol !== 'https:') return ''
    return url.href
  } catch {
    return ''
  }
}

function giftImageUrl(gift: unknown, value?: unknown) {
  const nested = ['media', 'image', 'preview', 'model']
    .map((key) => asRecord(readValue(gift, key)))
    .find((entry) => safeMediaUrl(readValue(entry, 'url', 'imageUrl', 'image_url')))
  return safeMediaUrl(readValue(gift, 'imageUrl', 'image_url', 'thumbnailUrl', 'previewUrl', 'previewImage', 'modelPngUrl', 'templateImageUrl'))
    || safeMediaUrl(readValue(nested, 'url', 'imageUrl', 'image_url'))
    || safeMediaUrl(readValue(value, 'imageUrl', 'image_url', 'previewUrl'))
}

function buildGiftHistory(gift: unknown): GiftHistoryEntry[] {
  return asList(readValue(gift, 'history', 'events', 'transfers')).flatMap((item, index) => {
    const event = asRecord(item)
    if (!event) return []
    const from = asRecord(readValue(event, 'fromUser', 'from', 'previousOwner'))
    const to = asRecord(readValue(event, 'toUser', 'to', 'owner'))
    return [{
      id: readText(event, 'id') || `gift-history-${index}`,
      type: readText(event, 'actionType', 'type', 'eventType') || 'событие',
      from: normalizeHandle(readText(from, 'username') || readText(event, 'fromUsername')) || undefined,
      to: normalizeHandle(readText(to, 'username') || readText(event, 'toUsername')) || undefined,
      priceStars: readNumber(event, 'priceStars', 'salePriceStars', 'amountStars'),
      time: formatRelativeTime(readText(event, 'createdAt', 'timestamp')),
    }]
  })
}

function collectMediaUrls(value: unknown): string[] {
  const items = Array.isArray(value) ? value : value ? [value] : []
  const urls = items.flatMap((item) => {
    if (typeof item === 'string') return [safeMediaUrl(item)]
    const media = asRecord(item)
    return [safeMediaUrl(readValue(media, 'url', 'src', 'imageUrl', 'image_url', 'originalUrl'))]
  }).filter(Boolean)
  return [...new Set(urls)].slice(0, 10)
}

function nestedNumber(source: unknown, ...keys: string[]) {
  const direct = readNumber(source, ...keys)
  if (direct !== undefined) return direct
  for (const container of ['stats', 'counts', '_count', 'metrics']) {
    const nested = readNumber(readValue(source, container), ...keys)
    if (nested !== undefined) return nested
  }
  return 0
}

function formatRelativeTime(value: string) {
  if (!value) return 'недавно'
  const time = Date.parse(value)
  if (!Number.isFinite(time)) return value
  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1_000))
  if (seconds < 60) return 'сейчас'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} мин.`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ч.`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} д.`
  return new Date(time).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function formatStars(value?: number) {
  if (!value || value <= 0) return 'без цены'
  return `${value.toLocaleString('ru-RU').replace(/\u00A0/g, ' ')} stars`
}

function formatShortCount(value?: number, singular = 'объектов') {
  if (!value || value <= 0) return `0 ${singular}`
  return `${value.toLocaleString('ru-RU').replace(/\u00A0/g, ' ')} ${singular}`
}

function toneByIndex(index: number): ToneId {
  const tones: ToneId[] = ['violet', 'blue', 'amber', 'pink', 'cyan', 'green']
  return tones[index % tones.length]
}

function isVerifiedBadge(value: unknown) {
  if (value === true) return true
  if (typeof value !== 'string') return false
  const normalized = value.trim().toUpperCase()
  return ['BLUE', 'GOLD', 'VERIFIED', 'OFFICIAL', 'BUSINESS', 'GOVERNMENT'].includes(normalized)
}

function verificationBadgeOf(source: unknown) {
  const explicitBadge = readValue(source, 'verificationBadge', 'verification_badge')
  if (isVerifiedBadge(explicitBadge)) return String(explicitBadge)
  const booleanFlag = readValue(source, 'isVerified', 'verified')
  return booleanFlag === true ? 'VERIFIED' : undefined
}

function buildConversationRows(payload: unknown): ConversationRow[] {
  const data = unwrapPayload(payload)
  return asList(readValue(data, 'conversations', 'items')).flatMap<ConversationRow>((item, index) => {
    const conversation = asRecord(item)
    if (!conversation) return []
    const members = asList(readValue(conversation, 'members')).map(asRecord).filter((member): member is Record<string, unknown> => Boolean(member))
    const selfMember = members.find((member) => Boolean(readValue(member, 'isViewer', 'isSelf')))
    const peer = members.find((member) => member !== selfMember) ?? selfMember ?? members[0]
    const lastMessage = asRecord(readValue(conversation, 'lastMessage'))
    const title = readText(conversation, 'title') || readText(peer, 'displayName', 'username') || (readValue(conversation, 'isSelf') ? 'Избранное' : 'Диалог')
    const id = readText(conversation, 'id')
    if (!id) return []
    const text = readText(lastMessage, 'content') || (readValue(lastMessage, 'media') ? 'медиа' : 'сообщений пока нет')
    return [{
      id,
      title,
      text,
      time: formatRelativeTime(readText(lastMessage, 'createdAt') || readText(conversation, 'createdAt')),
      mark: title.slice(0, 2).toUpperCase(),
      targetView: 'messages',
      avatarUrl: safeMediaUrl(readValue(conversation, 'avatarUrl') || readValue(peer, 'avatarUrl')) || undefined,
      verificationBadge: verificationBadgeOf(peer),
      unreadCount: readNumber(conversation, 'unreadCount') ?? 0,
      type: readText(conversation, 'type') || 'DIRECT',
      isSelf: Boolean(readValue(conversation, 'isSelf')),
      lastMessageId: readText(lastMessage, 'id') || undefined,
      lastMessageIsRead: typeof readValue(lastMessage, 'isRead') === 'boolean' ? Boolean(readValue(lastMessage, 'isRead')) : undefined,
      username: normalizeHandle(readText(peer, 'username')) || undefined,
      active: index === 0,
    }]
  })
}

function buildNotificationRows(payload: unknown): EventRow[] {
  const data = unwrapPayload(payload)
  return asList(readValue(data, 'notifications', 'items')).flatMap<EventRow>((item, index) => {
    const notification = asRecord(item)
    if (!notification) return []
    const actor = asRecord(readValue(notification, 'actor'))
    const actorName = normalizeHandle(readText(actor, 'username')) || readText(actor, 'displayName') || 'UnixGram'
    const message = readText(notification, 'message') || readText(notification, 'type') || 'новое уведомление'
    const createdAt = readText(notification, 'createdAt')
    return [{
      id: readText(notification, 'id') || `notification-${index}`,
      icon: (readText(actor, 'displayName', 'username') || 'U').slice(0, 1).toUpperCase(),
      title: message,
      actor: actorName,
      target: readText(notification, 'entityType'),
      value: readText(notification, 'type').toLowerCase().replaceAll('_', ' ') || 'уведомление',
      time: formatRelativeTime(createdAt),
      tone: toneByIndex(index),
      kind: 'уведомление',
      ageHours: createdAt ? Math.max(0, (Date.now() - Date.parse(createdAt)) / 3_600_000) : 0,
      avatarUrl: safeMediaUrl(readValue(actor, 'avatarUrl')) || undefined,
      verificationBadge: verificationBadgeOf(actor),
    }]
  })
}

function buildCommunityRows(payload: unknown): ProfileWatchRow[] {
  const data = unwrapPayload(payload)
  return asList(readValue(data, 'communities', 'items')).flatMap<ProfileWatchRow>((item, index) => {
    const community = asRecord(item)
    if (!community) return []
    const id = readText(community, 'id', 'slug')
    const name = normalizeHandle(readText(community, 'username', 'slug')) || id
    if (!id || !name) return []
    const memberCount = readNumber(community, 'memberCount', 'membersCount', 'subscribersCount')
    return [{
      id,
      name,
      displayName: readText(community, 'displayName', 'title', 'name') || name,
      note: readText(community, 'description', 'bio') || 'сообщество UnixGram',
      activity: memberCount !== undefined ? `${memberCount.toLocaleString('ru-RU')} участников` : readText(community, 'type') || 'сообщество',
      gifts: readText(community, 'privacy', 'visibility') || 'UnixGram',
      tone: toneByIndex(index),
      avatarUrl: safeMediaUrl(readValue(community, 'avatarUrl', 'imageUrl')) || undefined,
      verificationBadge: verificationBadgeOf(community),
      memberCount,
    }]
  })
}

function buildActivityRows(payload: unknown): ActivityRow[] {
  const data = unwrapPayload(payload)
  return asList(readValue(data, 'activities', 'items')).flatMap<ActivityRow>((item, index) => {
    const activity = asRecord(item)
    if (!activity) return []
    const type = readText(activity, 'type') || 'ACTIVITY'
    return [{
      id: readText(activity, 'id') || `activity-${index}`,
      label: readText(activity, 'actionLabel') || type.toLowerCase().replaceAll('_', ' '),
      detail: readText(activity, 'userAgent') || 'действие аккаунта',
      time: formatRelativeTime(readText(activity, 'createdAt')),
      type,
    }]
  })
}

function buildGiftCatalogRows(payload: unknown): GiftRow[] {
  const data = unwrapPayload(payload)
  return asList(readValue(data, 'collections', 'items')).flatMap<GiftRow>((item, index) => {
    const collection = asRecord(item)
    if (!collection) return []
    const name = readText(collection, 'name', 'title') || 'Коллекция'
    const id = readText(collection, 'id', 'slug')
    if (!id) return []
    const listingCount = readNumber(collection, 'listingCount') ?? 0
    const floorPriceStars = readNumber(collection, 'floorPrice')
    return [{
      id,
      mark: name.slice(0, 1).toUpperCase(),
      name,
      owner: 'рынок UnixGram',
      price: formatStars(floorPriceStars),
      delta: `${listingCount.toLocaleString('ru-RU')} лотов`,
      tone: toneByIndex(index),
      imageUrl: safeMediaUrl(readValue(collection, 'previewImage', 'imageUrl')) || undefined,
      listingCount,
      slug: readText(collection, 'slug') || undefined,
      collection: name,
      isOnSale: listingCount > 0,
      floorPriceStars,
    }]
  })
}

function buildChatMessages(payload: unknown, viewerId?: string | null, conversation?: ConversationRow | null): ChatMessage[] {
  const data = unwrapPayload(payload)
  const rawMessages = listOrItems(readValue(data, 'messages', 'items'))
  return rawMessages.flatMap<ChatMessage>((item, index) => {
    const message = asRecord(item)
    if (!message) return []
    const sender = asRecord(readValue(message, 'sender'))
    const content = readText(message, 'content')
    const media = asRecord(readValue(message, 'media'))
    if (!content && !media) return []
    const senderId = readText(sender, 'id')
    const mineFlag = readValue(sender, 'isViewer', 'isSelf')
    const mine = typeof mineFlag === 'boolean' ? mineFlag : Boolean(viewerId && senderId === viewerId)
    const reply = asRecord(readValue(message, 'replyTo'))
    const laterIncoming = rawMessages.slice(index + 1).some((next) => {
      const nextSender = asRecord(readValue(asRecord(next), 'sender'))
      return Boolean(viewerId && readText(nextSender, 'id') && readText(nextSender, 'id') !== viewerId)
    })
    const messageId = readText(message, 'id') || `message-${index}`
    const directRead = readValue(message, 'isRead', 'read')
    const read = mine && (typeof directRead === 'boolean'
      ? directRead
      : laterIncoming || (conversation?.lastMessageId === messageId && Boolean(conversation.lastMessageIsRead)))
    return [{
      id: messageId,
      content,
      time: formatRelativeTime(readText(message, 'createdAt')),
      mine,
      senderName: readText(sender, 'displayName', 'username') || 'UnixGram',
      senderAvatar: safeMediaUrl(readValue(sender, 'avatarUrl')) || undefined,
      mediaLabel: media ? readText(media, 'name') || readText(message, 'kind') || 'вложение' : undefined,
      mediaUrl: safeMediaUrl(readValue(media, 'url')) || undefined,
      mediaType: readText(media, 'type', 'mime') || undefined,
      edited: Boolean(readText(message, 'editedAt')),
      read,
      reply: reply ? {
        id: readText(reply, 'id'),
        content: readText(reply, 'content', 'quote') || 'вложение',
        authorName: readText(reply, 'authorName') || 'UnixGram',
      } : undefined,
      reactions: asList(readValue(message, 'reactions')).flatMap((item) => {
        const reaction = asRecord(item)
        const emoji = readText(reaction, 'emoji')
        if (!emoji) return []
        return [{ emoji, count: readNumber(reaction, 'count') ?? 1, reactedByViewer: Boolean(readValue(reaction, 'reactedByViewer')) }]
      }),
    }]
  })
}

function buildProfileSummary(snapshot: SyncSnapshot | null, fallbackHandle: string): ProfileSummary | null {
  const data = unwrapPayload(snapshot?.profile)
  const profile =
    asRecord(data?.profile)
    ?? asRecord(data?.user)
    ?? asRecord(data?.account)
    ?? asRecord(data?.result)
    ?? data
  if (!profile) return null

  const handle = normalizeHandle(readText(profile, 'username') || fallbackHandle)
  if (!handle) return null

  const displayName = readText(profile, 'displayName', 'display_name', 'name') || handle
  const bio = readText(profile, 'bio', 'description', 'location') || 'живой профиль UnixGram'
  const postsCount = readNumber(profile, 'postsCount', 'posts_count', 'posts')
    ?? (asList(readValue(profile, 'posts')).length || undefined)
  const followersCount = readNumber(profile, 'followersCount', 'followers_count')
  const profileViews = readNumber(profile, 'profileViews', 'viewsCount')
  const profileGiftCount = readNumber(profile, 'giftsCount', 'gifts_count')
    ?? (asList(readValue(profile, 'gifts')).length || undefined)

  return {
    watch: {
      id: `live-${handle}`,
      name: handle,
      displayName,
      note: bio,
      activity: postsCount ? `${postsCount} постов в профиле` : 'профиль подключён',
      gifts: formatShortCount(profileGiftCount, 'подарков'),
      tone: 'cyan',
      avatarUrl: safeMediaUrl(readValue(profile, 'avatarUrl', 'avatar_url', 'avatar')) || undefined,
      coverUrl: safeMediaUrl(readValue(profile, 'coverUrl', 'cover_url', 'bannerUrl', 'headerImageUrl')) || undefined,
      verificationBadge: verificationBadgeOf(profile),
      premium: Boolean(readValue(profile, 'isPremium', 'premium')),
      emojiStatus: readText(profile, 'emojiStatus', 'emoji_status') || undefined,
    },
    bio,
    postsCount,
    followersCount,
    profileViews,
    followingCount: readNumber(profile, 'followingCount', 'following_count'),
    giftCount: profileGiftCount,
    joinedAt: readText(profile, 'joinedAt', 'createdAt', 'registeredAt') || undefined,
    alternateUsernames: asList(readValue(profile, 'usernames', 'alternateUsernames')).flatMap((value) => typeof value === 'string' ? [normalizeHandle(value)] : readText(value, 'username') ? [normalizeHandle(readText(value, 'username'))] : []).filter(Boolean),
  }
}

function buildGiftRows(snapshot: SyncSnapshot | null, fallbackOwner = ''): GiftRow[] {
  const root = asRecord(snapshot?.gifts)
  const payload = root?.data ?? snapshot?.gifts
  const data = unwrapPayload(payload)
  const rawGifts = Array.isArray(payload) ? payload : asList(readValue(data, 'gifts', 'items'))
  return rawGifts.flatMap<GiftRow>((item, index) => {
      const gift = asRecord(item)
      if (!gift) return []
      const owner = asRecord(readValue(gift, 'owner', 'currentOwner'))
      const title =
        readText(gift, 'title', 'collectionName', 'templateSlug', 'name')
        || 'Подарок'
      const serial =
        readNumber(gift, 'serialNumber', 'numericId')
        ?? readNumber(readValue(gift, 'value'), 'serialNumber')
      const listing = asRecord(readValue(gift, 'currentListing', 'listing', 'marketplaceListing'))
      const value = asRecord(readValue(gift, 'value', 'valuation'))
      const model = asRecord(readValue(gift, 'model'))
      const background = asRecord(readValue(gift, 'background', 'backdrop'))
      const pattern = asRecord(readValue(gift, 'pattern', 'symbol'))
      const price =
        readNumber(listing, 'priceStars')
        ?? readNumber(gift, 'listingPriceStars', 'priceStars', 'salePriceStars', 'price')
        ?? readNumber(value, 'valueStars', 'estimatedValueStars', 'lastSaleStars', 'floorPriceStars')
        ?? readNumber(gift, 'estimatedValueStars', 'valueStars')
      const floor = readNumber(value, 'floorPriceStars', 'floorStars', 'listedFloorStars') ?? readNumber(gift, 'floorStars')
      const lastSale = readNumber(value, 'lastSaleStars') ?? readNumber(gift, 'lastSaleStars')
      const valuation = readNumber(value, 'valueStars', 'estimatedValueStars') ?? readNumber(gift, 'estimatedValueStars', 'valueStars')
      const change =
        floor && lastSale && lastSale > 0
          ? `${Math.round(((floor - lastSale) / lastSale) * 100)}%`
          : floor
            ? `floor ${formatStars(floor)}`
            : 'без динамики'
      const history = buildGiftHistory(gift)
      const listedFlag = readValue(gift, 'isOnSale', 'isListed', 'listed', 'onSale')
      const listingStatus = readText(listing, 'status').toLowerCase()
      return [{
        id: readText(gift, 'id') || `live-gift-${index}`,
        mark: title.slice(0, 1).toUpperCase() || 'G',
        name: serial ? `${title} #${serial}` : title,
        owner:
          normalizeHandle(readText(owner, 'username') || readText(gift, 'ownerUsername', 'owner_username', 'currentOwnerUsername'))
          || normalizeHandle(fallbackOwner)
          || 'unknown',
        price: formatStars(price),
        delta: change.startsWith('-') || change.startsWith('0') || change.startsWith('floor') || change === 'без динамики' ? change : `+${change}`,
        tone: toneByIndex(index),
        imageUrl: giftImageUrl(gift, value) || undefined,
        serial: serial ?? undefined,
        collection: readText(gift, 'collectionName', 'title') || undefined,
        model: readText(gift, 'modelName') || readText(model, 'name', 'title') || undefined,
        background: readText(gift, 'backgroundName') || readText(background, 'name', 'title') || undefined,
        pattern: readText(gift, 'patternName') || readText(pattern, 'name', 'title') || undefined,
        rarity: [readNumber(gift, 'modelRarityPercent'), readNumber(gift, 'patternRarityPercent'), readNumber(gift, 'backgroundRarityPercent')]
          .filter((item): item is number => item !== undefined)
          .map((item) => `${item}%`).join(' · ') || undefined,
        isOnSale: typeof listedFlag === 'boolean' ? listedFlag : Boolean(listing && (!listingStatus || listingStatus === 'active')),
        listingId: readText(gift, 'activeListingId') || readText(listing, 'id') || undefined,
        slug: readText(gift, 'collectionSlug', 'templateSlug') || undefined,
        valueStars: valuation,
        floorPriceStars: floor,
        lastSaleStars: lastSale,
        history,
      }]
    })
}

function buildGiftDetails(payload: unknown, fallback: GiftRow): GiftDetails {
  const data = unwrapPayload(payload)
  const gift = asRecord(readValue(data, 'gift')) ?? asRecord(data) ?? {}
  const owner = asRecord(readValue(gift, 'owner', 'currentOwner'))
  const value = asRecord(readValue(gift, 'value', 'valuation'))
  const listing = asRecord(readValue(gift, 'currentListing', 'listing', 'marketplaceListing'))
  const model = asRecord(readValue(gift, 'model'))
  const background = asRecord(readValue(gift, 'background', 'backdrop'))
  const pattern = asRecord(readValue(gift, 'pattern', 'symbol'))
  const history = buildGiftHistory(gift)
  const listedFlag = readValue(gift, 'isOnSale', 'isListed', 'listed', 'onSale')
  return {
    ...fallback,
    owner: normalizeHandle(readText(owner, 'username') || readText(gift, 'ownerUsername', 'currentOwnerUsername')) || fallback.owner,
    ownerDisplayName: readText(owner, 'displayName') || readText(gift, 'ownerDisplayName') || undefined,
    ownerAvatarUrl: safeMediaUrl(readValue(owner, 'avatarUrl') || readValue(gift, 'ownerAvatarUrl')) || undefined,
    imageUrl: giftImageUrl(gift, value) || fallback.imageUrl,
    serial: readNumber(gift, 'serialNumber') ?? fallback.serial,
    collection: readText(gift, 'collectionName', 'title') || fallback.collection,
    model: readText(gift, 'modelName') || readText(model, 'name', 'title') || fallback.model,
    background: readText(gift, 'backgroundName') || readText(background, 'name', 'title') || fallback.background,
    pattern: readText(gift, 'patternName') || readText(pattern, 'name', 'title') || fallback.pattern,
    rarity: [readNumber(gift, 'modelRarityPercent'), readNumber(gift, 'patternRarityPercent'), readNumber(gift, 'backgroundRarityPercent')]
      .filter((item): item is number => item !== undefined)
      .map((item) => `${item}%`).join(' · ') || fallback.rarity,
    isOnSale: typeof listedFlag === 'boolean' ? listedFlag : Boolean(listing) || fallback.isOnSale,
    listingId: readText(gift, 'activeListingId') || readText(listing, 'id') || fallback.listingId,
    slug: readText(gift, 'collectionSlug', 'templateSlug') || fallback.slug,
    valueStars: readNumber(value, 'valueStars', 'estimatedValueStars') ?? readNumber(gift, 'estimatedValueStars', 'valueStars') ?? fallback.valueStars,
    floorPriceStars: readNumber(value, 'floorPriceStars', 'floorStars', 'listedFloorStars') ?? readNumber(gift, 'floorStars') ?? fallback.floorPriceStars,
    lastSaleStars: readNumber(value, 'lastSaleStars') ?? readNumber(gift, 'lastSaleStars') ?? fallback.lastSaleStars,
    history,
    historyCount: history.length,
  }
}

function mergeProfiles(liveProfile: ProfileSummary | null, includePreview: boolean) {
  if (!liveProfile) return includePreview ? profileWatchRows : []
  const seen = new Set<string>()
  return [liveProfile.watch, ...(includePreview ? profileWatchRows : [])].filter((profile) => {
    const key = profile.name.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function buildSocialPosts(feedPayload: unknown, withPreview = false): SocialPost[] {
  const data = unwrapPayload(feedPayload)
  const candidates = listOrItems(readValue(data, 'feed'))
  const profilePosts = listOrItems(readValue(data, 'posts'))
  const fallbackCandidates = listOrItems(readValue(data, 'items', 'results'))
  const source = candidates.length ? candidates : profilePosts.length ? profilePosts : fallbackCandidates
  const rows = source
    .flatMap<SocialPost>((item, index) => {
      const post = asRecord(item)
      if (!post) return []
      const author = asRecord(readValue(post, 'author', 'user', 'account', 'owner'))
      const username = normalizeHandle(readText(author, 'username', 'handle') || readText(post, 'username', 'authorUsername'))
      const text = readText(post, 'text', 'content', 'caption', 'message', 'body')
      const displayName = readText(author, 'displayName', 'display_name', 'name') || username
      const createdAt = readText(post, 'createdAt', 'created_at', 'publishedAt', 'date')
      const directImages = collectMediaUrls(readValue(post, 'imageUrls', 'image_urls', 'images'))
      const attachmentImages = collectMediaUrls(readValue(post, 'media', 'attachments', 'image', 'photo'))
      const videoUrl = safeMediaUrl(readValue(post, 'videoUrl', 'video_url', 'video'))
      const giftRecord = asRecord(readValue(post, 'gift', 'giftInstance', 'attachedGift', 'giftAttachment'))
      const giftTemplate = asRecord(readValue(giftRecord, 'template', 'collection', 'gift'))
      const giftTitle = readText(giftRecord, 'title', 'name', 'collectionName') || readText(giftTemplate, 'title', 'name')
      const giftSerial = readText(giftRecord, 'serialNumber', 'serial', 'number')
      if (!username || (!text && directImages.length === 0 && attachmentImages.length === 0 && !videoUrl && !giftTitle)) return []
      return [{
        id: readText(post, 'id', 'postId') || `live-post-${index}`,
        username,
        displayName,
        avatarUrl: safeMediaUrl(readValue(author, 'avatarUrl', 'avatar_url', 'avatar')),
        verificationBadge: verificationBadgeOf(author),
        premium: Boolean(readValue(author, 'premium', 'isPremium')),
        emojiStatus: readText(author, 'emojiStatus', 'emoji_status'),
        text,
        time: readText(post, 'timeAgo', 'relativeTime') || formatRelativeTime(createdAt),
        createdAt,
        tone: toneByIndex(index),
        verified: Boolean(verificationBadgeOf(author)),
        promoted: Boolean(readValue(post, 'promoted', 'isPromoted')),
        imageUrls: [...new Set([...directImages, ...attachmentImages])],
        videoUrl: videoUrl || undefined,
        gift: giftTitle ? {
          id: readText(giftRecord, 'id', 'giftInstanceId') || undefined,
          title: giftTitle,
          imageUrl: safeMediaUrl(readValue(giftRecord, 'imageUrl', 'image_url', 'thumbnailUrl') || readValue(giftTemplate, 'imageUrl', 'image_url')) || undefined,
          serial: giftSerial || undefined,
        } : undefined,
        likes: nestedNumber(post, 'likesCount', 'likeCount', 'likes'),
        comments: nestedNumber(post, 'commentsCount', 'commentCount', 'comments'),
        reposts: nestedNumber(post, 'repostsCount', 'repostCount', 'reposts'),
        views: nestedNumber(post, 'viewsCount', 'viewCount', 'views'),
      } satisfies SocialPost]
    })
  return rows.length > 0 ? rows : withPreview ? fallbackPosts : []
}

function readFeedPageInfo(feedPayload: unknown): FeedPageInfo {
  const data = unwrapPayload(feedPayload)
  const pageInfo = asRecord(readValue(data, 'pageInfo', 'pagination', 'page_info'))
  const cursor = readText(pageInfo, 'nextCursor', 'next_cursor', 'cursor') || null
  const hasMoreValue = readValue(pageInfo, 'hasMore', 'has_more')
  return { cursor, hasMore: typeof hasMoreValue === 'boolean' ? hasMoreValue : Boolean(cursor) }
}

function UnixPostCard({
  post,
  onShare,
  onProfile,
  origin = 'feed',
}: {
  post: SocialPost
  onShare: (post: SocialPost) => void
  onProfile: (post: SocialPost) => void
  origin?: 'feed' | 'profile'
}) {
  const [openMenu, setOpenMenu] = useState(false)
  const openMedia = useContext(MediaViewerContext)
  return (
    <article className={`unix-post unix-post--${origin} ${origin === 'profile' ? 'profile-post' : ''}`}>
      <button className={`post-avatar tone-${post.tone}`} type="button" onClick={() => onProfile(post)} aria-label={`Профиль ${post.displayName}`}>
        {post.avatarUrl ? <img src={post.avatarUrl} alt="" loading="lazy" referrerPolicy="no-referrer" /> : post.displayName.slice(0, 1).toUpperCase()}
      </button>
      <div className="unix-post__main">
        <header className="unix-post__head">
          <div>
            <button className="post-author" type="button" onClick={() => onProfile(post)}>
              <strong>{post.displayName}</strong>
              {post.verified && <VerifiedBadge kind={post.verificationBadge} />}
              {post.premium && <span className="premium-mark" aria-label="Unix Premium">✦</span>}
              {post.emojiStatus && <span className="emoji-status">{post.emojiStatus}</span>}
              <span className="unix-link">@{post.username}</span>
            </button>
            <span>· {post.time}</span>
          </div>
          <button type="button" aria-label="Меню публикации" aria-expanded={openMenu} aria-controls={`post-menu-${post.id}`} onClick={() => setOpenMenu((current) => !current)}>
            <MoreHorizontal size={19} />
          </button>
          {openMenu && <div className="post-menu" id={`post-menu-${post.id}`} role="menu"><button type="button" role="menuitem" onClick={() => { onShare(post); setOpenMenu(false) }}>Скопировать ссылку</button><SafeExternalLink role="menuitem" href={`https://unixgram.com/post/${post.id}`} onClick={() => setOpenMenu(false)}>Открыть публикацию</SafeExternalLink></div>}
        </header>
        {post.text && <p className="unix-post__text">{post.text}</p>}
        {post.imageUrls.length > 0 && <div className={`post-media-grid count-${Math.min(post.imageUrls.length, 4)}`}>{post.imageUrls.slice(0, 4).map((url, index) => <button key={url} type="button" onClick={() => openMedia(post.imageUrls, index, `Фото публикации ${post.displayName}`)}><img src={url} alt={`Медиа ${index + 1} публикации ${post.displayName}`} loading="lazy" referrerPolicy="no-referrer" />{index === 3 && post.imageUrls.length > 4 && <b>+{post.imageUrls.length - 4}</b>}</button>)}</div>}
        {post.videoUrl && <video className="post-video" src={post.videoUrl} controls preload="metadata" aria-label={`Видео публикации ${post.displayName}`} />}
        {post.gift && <SafeExternalLink href={post.gift.id ? `https://unixgram.com/gift/${post.gift.id}` : `https://unixgram.com/post/${post.id}`} className="post-gift-media">{post.gift.imageUrl ? <img src={post.gift.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <Gift size={38} />}<div><strong>{post.gift.title}{post.gift.serial ? ` #${post.gift.serial}` : ''}</strong><span>подарок UnixGram · открыть</span></div></SafeExternalLink>}
        <div className="post-meta-actions">{post.promoted && <span><Rocket size={14} /> Продвигается</span>}</div>
        <div className="unix-post__actions"><SafeExternalLink aria-label="Комментарии" href={`https://unixgram.com/post/${post.id}`}><MessageCircle size={18} /><span>{post.comments}</span></SafeExternalLink><SafeExternalLink aria-label="Репост" href={`https://unixgram.com/post/${post.id}`}><Repeat2 size={18} /><span>{post.reposts}</span></SafeExternalLink><SafeExternalLink aria-label="Нравится" href={`https://unixgram.com/post/${post.id}`}><Heart size={18} /><span>{post.likes}</span></SafeExternalLink><button type="button" aria-label="Поделиться" onClick={() => onShare(post)}><Share2 size={18} /></button><span className="post-views"><Eye size={16} /> {post.views}</span></div>
      </div>
    </article>
  )
}

function FeedView({ posts, onShare, onProfile, loading, error, hasMore, isPreview, canPublish, following, onReload, onLoadMore, onTab, onOpenSearch, onOpenTags, onPublish, viewer }: {
  posts: SocialPost[]
  onShare: (post: SocialPost) => void
  onProfile: (post: SocialPost) => void
  loading: boolean
  error: string
  hasMore: boolean
  isPreview: boolean
  canPublish: boolean
  following: boolean
  onReload: () => void
  onLoadMore: () => void
  onTab: (following: boolean) => void
  onOpenSearch: () => void
  onOpenTags: () => void
  onPublish: (content: string, images: File[]) => Promise<void>
  viewer: ProfileWatchRow | null
}) {
  const [content, setContent] = useState('')
  const [images, setImages] = useState<PostImageDraft[]>([])
  const [publishing, setPublishing] = useState(false)
  const [composerError, setComposerError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const imagesRef = useRef<PostImageDraft[]>([])
  useEffect(() => {
    imagesRef.current = images
  }, [images])
  useEffect(() => () => {
    imagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl))
  }, [])
  const selectTab = (next: 'for-you' | 'following') => {
    onTab(next === 'following')
  }
  const chooseImages = (files: FileList | null) => {
    if (!files) return
    setComposerError('')
    const accepted = Array.from(files).filter((file) => file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024)
    const selected = accepted.slice(0, Math.max(0, 4 - images.length))
    if (accepted.length !== files.length) setComposerError('поддерживаются только изображения до 10 МБ')
    else if (selected.length !== accepted.length) setComposerError('к публикации можно прикрепить не больше четырёх фото')
    setImages((current) => [...current, ...selected.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))])
    if (fileRef.current) fileRef.current.value = ''
  }
  const removeImage = (index: number) => {
    setImages((current) => {
      const target = current[index]
      if (target) URL.revokeObjectURL(target.previewUrl)
      return current.filter((_, itemIndex) => itemIndex !== index)
    })
  }
  const submitPost = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canPublish) {
      setComposerError('войдите в UnixGram, чтобы публиковать записи')
      return
    }
    if (!content.trim() && images.length === 0) return
    setPublishing(true)
    setComposerError('')
    try {
      await onPublish(content, images.map((image) => image.file))
      setContent('')
      images.forEach((image) => URL.revokeObjectURL(image.previewUrl))
      setImages([])
      textareaRef.current?.focus()
    } catch (reason) {
      setComposerError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setPublishing(false)
    }
  }
  return (
    <>
      <header className="feed-head">
        <div className="feed-title">
          <div>
            <small className="feed-kicker">unixgram</small>
            <h1>Лента</h1>
          </div>
          <span>{isPreview ? 'гость' : 'онлайн'}</span>
        </div>
        <div className="feed-head__actions">
          <button className="icon-button" type="button" aria-label="Открыть поиск" onClick={onOpenSearch}><Search size={18} /></button>
          <button className="compose-round" type="button" aria-label="Новая публикация" onClick={() => textareaRef.current?.focus()}><PenLine size={20} /></button>
        </div>
      </header>
      <nav className="feed-tabs" aria-label="Лента"><button type="button" disabled={loading} aria-current={!following ? 'page' : undefined} className={!following ? 'is-active' : ''} onClick={() => selectTab('for-you')}>Для вас</button><button type="button" disabled={loading} aria-current={following ? 'page' : undefined} className={following ? 'is-active' : ''} onClick={() => selectTab('following')}>Подписки</button><button type="button" onClick={onOpenTags}>Теги</button></nav>
      <section className="unix-feed" aria-busy={loading}>
        <form className="feed-composer-card" onSubmit={(event) => void submitPost(event)}>
          <div className="feed-composer-identity">
            {viewer?.avatarUrl ? <img className="feed-story__avatar" src={viewer.avatarUrl} alt="" referrerPolicy="no-referrer" /> : <span className="feed-story__avatar">{(viewer?.displayName ?? viewer?.name ?? 'U').slice(0, 1).toUpperCase()}</span>}
            <span><strong>{viewer?.displayName ?? viewer?.name ?? 'ваш аккаунт'}</strong><small>{canPublish ? `@${viewer?.name ?? 'unixgram'}` : 'гостевой просмотр'}</small></span>
          </div>
          <div className="feed-composer">
            <textarea ref={textareaRef} name="post-content" value={content} maxLength={4096} disabled={publishing} aria-label="Текст новой публикации" placeholder="Что нового?" onChange={(event) => setContent(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') event.currentTarget.form?.requestSubmit() }} />
            {images.length > 0 && <div className={`composer-media-grid count-${images.length}`}>{images.map((image, index) => <figure key={image.previewUrl}><img src={image.previewUrl} alt={`Выбранное фото ${index + 1}`} /><button type="button" aria-label={`Убрать фото ${index + 1}`} onClick={() => removeImage(index)}><X size={15} /></button></figure>)}</div>}
            {composerError && <p className="composer-error" role="alert">{composerError}</p>}
            <div className="feed-composer__tools">
              <input ref={fileRef} name="post-images" type="file" accept="image/*" multiple hidden onChange={(event) => chooseImages(event.target.files)} />
              <button type="button" disabled={!canPublish || publishing || images.length >= 4} aria-label="Добавить фото" onClick={() => fileRef.current?.click()}><Paperclip size={17} /><span>Фото</span></button>
              <small>{content.length}/4096</small>
              <button className="publish-button" type="submit" disabled={!canPublish || publishing || (!content.trim() && images.length === 0)}>{publishing ? 'Публикуем…' : 'Опубликовать'}</button>
            </div>
          </div>
        </form>
        {error && <div className="feed-state is-error" role="alert"><strong>Лента недоступна</strong><p>{error}</p><button type="button" onClick={onReload}>Повторить</button></div>}
        {loading && posts.length === 0 && <div className="feed-skeleton" role="status" aria-label="Загрузка ленты">{[1,2,3].map((item) => <span key={item}><i /><b /><em /></span>)}</div>}
        {!loading && !error && posts.length === 0 && <div className="feed-state"><strong>Войдите в UnixGram</strong><p>после входа здесь автоматически появятся настоящие публикации, профили и медиа.</p><SafeExternalLink href="https://unixgram.com/auth/login">Открыть вход</SafeExternalLink></div>}
        {posts.map((post) => <UnixPostCard key={post.id} post={post} onShare={onShare} onProfile={onProfile} />)}
        {posts.length > 0 && !isPreview && <div className="feed-load-more">{hasMore ? <button type="button" disabled={loading} onClick={onLoadMore}>{loading ? 'Загружаем…' : 'Показать ещё'}</button> : <span>Вы посмотрели все загруженные публикации</span>}</div>}
      </section>
    </>
  )
}

function SearchView({ query, onQuery, onGift, onProfile, unified, giftRows, profiles, remotePayload, loading, error, live }: { query: string; onQuery: (value: string) => void; onGift: (id: string) => void; onProfile: (profile: ProfileWatchRow) => void; unified: boolean; giftRows: GiftRow[]; profiles: ProfileWatchRow[]; remotePayload: unknown; loading: boolean; error: string; live: boolean }) {
  type SearchCategory = 'all' | 'profiles' | 'communities' | 'gifts' | 'posts' | 'hashtags'
  const [category, setCategory] = useState<SearchCategory>('all')
  const needle = query.trim().toLowerCase()
  const resultGifts = giftRows.filter((item) => !needle || Object.values(item).join(' ').toLowerCase().includes(needle))
  const data = unwrapPayload(remotePayload)
  const remotePeople = listOrItems(readValue(data, 'people')).flatMap<ProfileWatchRow>((item, index) => {
    const profile = asRecord(item)
    if (!profile) return []
    const name = normalizeHandle(readText(profile, 'username'))
    if (!name) return []
    return [{ id: readText(profile, 'id') || `search-person-${index}`, name, displayName: readText(profile, 'displayName') || name, note: readText(profile, 'bio') || 'профиль UnixGram', activity: readText(profile, 'status') || 'профиль', gifts: '', tone: toneByIndex(index), avatarUrl: safeMediaUrl(readValue(profile, 'avatarUrl')) || undefined, verificationBadge: verificationBadgeOf(profile), premium: Boolean(readValue(profile, 'premium', 'isPremium')), emojiStatus: readText(profile, 'emojiStatus', 'emoji_status') || undefined }]
  })
  const resultProfiles = live ? remotePeople : profiles.filter((item) => !needle || Object.values(item).join(' ').toLowerCase().includes(needle))
  const remoteCommunities = buildCommunityRows({ communities: listOrItems(readValue(data, 'communities')) })
  const remotePosts = buildSocialPosts({ posts: readValue(readValue(data, 'posts'), 'items') || [] })
  const remoteHashtags = asList(readValue(data, 'hashtags')).flatMap<{ tag: string; count: number }>((item) => {
    const hashtag = asRecord(item)
    const tag = readText(hashtag, 'tag').replace(/^#/, '')
    return tag ? [{ tag, count: readNumber(hashtag, 'postCount') ?? 0 }] : []
  })
  const categoryTabs: { id: SearchCategory; label: string; count?: number }[] = unified ? [
    { id: 'all', label: 'Всё', count: resultProfiles.length + remoteCommunities.length + resultGifts.length + remotePosts.length + remoteHashtags.length },
    { id: 'profiles', label: 'Люди', count: resultProfiles.length },
    { id: 'communities', label: 'Сообщества', count: remoteCommunities.length },
    { id: 'gifts', label: 'Подарки', count: resultGifts.length },
    { id: 'posts', label: 'Посты', count: remotePosts.length },
    { id: 'hashtags', label: 'Теги', count: remoteHashtags.length },
  ] : [
    { id: 'profiles', label: 'Люди', count: resultProfiles.length },
  ]
  const shows = (target: Exclude<SearchCategory, 'all'>) => category === 'all' || category === target || !unified
  return (
    <>
      <header className="workspace-head"><div><span className="eyebrow">{unified ? 'единый поиск' : 'поиск профилей'}</span><h1>Поиск</h1></div></header>
      <section className="search-workspace">
        <label className="hero-search"><span className="visually-hidden">Поиск в UnixGram</span><Search size={22} /><input name="unixgram-search" autoFocus value={query} onChange={(event) => onQuery(event.target.value)} placeholder="профиль, подарок, лот или событие" />{query && <button type="button" aria-label="Очистить поиск" onClick={() => onQuery('')}><X size={18} /></button>}</label>
        <div className="search-summary"><ListFilter size={16} /><span>{query.trim().length < 2 ? (live ? 'введите минимум 2 символа' : 'популярное и недавнее в предпросмотре') : loading ? 'ищем в UnixGram…' : unified ? `профили ${resultProfiles.length} · сообщества ${remoteCommunities.length} · подарки ${resultGifts.length} · посты ${remotePosts.length} · теги ${remoteHashtags.length}` : `профили ${resultProfiles.length}`}</span></div>
        <div className="search-category-tabs" role="tablist" aria-label="Категории поиска">{categoryTabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={category === tab.id || (!unified && tab.id === 'profiles')} tabIndex={category === tab.id || (!unified && tab.id === 'profiles') ? 0 : -1} className={category === tab.id || (!unified && tab.id === 'profiles') ? 'is-active' : ''} onKeyDown={moveTabByArrow} onClick={() => setCategory(tab.id)}><span>{tab.label}</span>{tab.count !== undefined && <b>{tab.count}</b>}</button>)}</div>
        {error && <div className="feed-state is-error" role="alert"><strong>поиск недоступен</strong><p>{error}</p></div>}
        {loading && <div className="feed-skeleton" role="status" aria-label="Поиск в UnixGram"><span><i /><b /><em /></span></div>}
        <div className="search-results">
          {shows('profiles') && <section><h2>Профили</h2>{resultProfiles.map((profile) => <button key={profile.id} type="button" onClick={() => onProfile(profile)}>{profile.avatarUrl ? <img className="result-mark" src={profile.avatarUrl} alt="" referrerPolicy="no-referrer" /> : <span className={`asset-mark tone-${profile.tone}`}>{profile.name[0].toUpperCase()}</span>}<span><strong>{profile.displayName ?? `@${profile.name}`}<VerifiedBadge kind={profile.verificationBadge} />{profile.premium && <span className="premium-mark" aria-label="Unix Premium">✦</span>}{profile.emojiStatus && <span className="emoji-status">{profile.emojiStatus}</span>}</strong><small>@{profile.name} · {profile.note}</small></span></button>)}{!loading && needle.length >= 2 && resultProfiles.length === 0 && <p className="result-empty">профили не найдены</p>}</section>}
          {unified && shows('communities') && (remoteCommunities.length > 0 || category === 'communities') && <section><h2>Сообщества</h2>{remoteCommunities.map((community) => <button key={community.id} type="button" onClick={() => onProfile(community)}>{community.avatarUrl ? <img className="result-mark" src={community.avatarUrl} alt="" referrerPolicy="no-referrer" /> : <span className={`asset-mark tone-${community.tone}`}>{community.name[0].toUpperCase()}</span>}<span><strong>{community.displayName}<VerifiedBadge kind={community.verificationBadge} /></strong><small>{community.activity}</small></span></button>)}{!loading && remoteCommunities.length === 0 && <p className="result-empty">сообщества не найдены</p>}</section>}
          {unified && shows('gifts') && <section><h2>Подарки</h2>{resultGifts.map((giftItem) => <button key={giftItem.id} type="button" onClick={() => onGift(giftItem.id)}>{giftItem.imageUrl ? <img className="result-mark" src={giftItem.imageUrl} alt="" referrerPolicy="no-referrer" /> : <span className={`asset-mark tone-${giftItem.tone}`}>{giftItem.mark}</span>}<span><strong>{giftItem.name}</strong><small>{giftItem.owner} · {giftItem.price}</small></span></button>)}{!loading && needle.length >= 2 && resultGifts.length === 0 && <p className="result-empty">подарки не найдены</p>}</section>}
          {unified && shows('posts') && (remotePosts.length > 0 || category === 'posts') && <section><h2>Публикации</h2>{remotePosts.map((post) => <SafeExternalLink key={post.id} className="search-post-result" href={`https://unixgram.com/post/${post.id}`}><span className={`asset-mark tone-${post.tone}`}>{post.displayName[0].toUpperCase()}</span><span><strong>{post.displayName}</strong><small>{post.text}</small></span></SafeExternalLink>)}{!loading && remotePosts.length === 0 && <p className="result-empty">публикации не найдены</p>}</section>}
          {unified && shows('hashtags') && (remoteHashtags.length > 0 || category === 'hashtags') && <section><h2>Хэштеги</h2>{remoteHashtags.map((hashtag) => <button key={hashtag.tag} type="button" onClick={() => onQuery(`#${hashtag.tag}`)}><span className="asset-mark tone-cyan">#</span><span><strong>#{hashtag.tag}</strong><small>{hashtag.count.toLocaleString('ru-RU')} публикаций</small></span></button>)}{!loading && remoteHashtags.length === 0 && <p className="result-empty">хэштеги не найдены</p>}</section>}
        </div>
        {!loading && !error && needle.length >= 2 && resultProfiles.length + resultGifts.length + remoteCommunities.length + remotePosts.length + remoteHashtags.length === 0 && <div className="empty-state">UnixGram ничего не нашёл по этому запросу</div>}
      </section>
    </>
  )
}

function MessagesView({ conversation, live, viewerId, onProfile, onRead }: { conversation: ConversationRow | null; live: boolean; viewerId?: string | null; onProfile: (username: string) => void; onRead: (conversationId: string) => void }) {
  const openMedia = useContext(MediaViewerContext)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [attachment, setAttachment] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const load = useCallback(async (silent = false) => {
    if (!live || !conversation) return
    if (!silent) {
      setLoading(true)
      setError('')
    }
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const payload = await invoke<unknown>('unixgram_conversation', { conversationId: conversation.id })
      setMessages(buildChatMessages(payload, viewerId, conversation))
      if (conversation.unreadCount) {
        await invoke('unixgram_mark_conversation_read', { conversationId: conversation.id }).catch(() => undefined)
        onRead(conversation.id)
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      if (!silent) setLoading(false)
    }
  }, [conversation, live, onRead, viewerId])
  useEffect(() => {
    // Loading the selected remote conversation is the synchronization purpose of this effect.
    // oxlint-disable-next-line react/set-state-in-effect
    void load()
    if (!live || !conversation) return
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load(true)
    }, 15_000)
    return () => window.clearInterval(timer)
  }, [conversation, live, load])
  const conversationId = conversation?.id ?? ''
  useEffect(() => {
    // A conversation switch must restore that peer's local draft before the user types.
    // oxlint-disable-next-line react/set-state-in-effect
    setDraft(conversationId ? localStorage.getItem(`unixgram-message-draft:${conversationId}`) ?? '' : '')
    setReplyTo(null)
    setAttachment(null)
  }, [conversationId])
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!live || !conversation || (!draft.trim() && !attachment) || sending) return
    setSending(true)
    setError('')
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const shared = {
        conversationId: conversation.id,
        content: draft.trim(),
        replyToId: replyTo?.id ?? null,
        replyQuote: replyTo?.content.slice(0, 240) ?? null,
        clientMessageId: crypto.randomUUID(),
      }
      if (attachment) {
        if (attachment.size > 20 * 1024 * 1024) throw new Error('файл должен быть меньше 20 МБ')
        const bytes = Array.from(new Uint8Array(await attachment.arrayBuffer()))
        await invoke('unixgram_send_attachment', { request: {
          ...shared,
          fileName: attachment.name,
          mimeType: attachment.type || 'application/octet-stream',
          bytes,
        } })
      } else {
        await invoke('unixgram_send_message', shared)
      }
      setDraft('')
      localStorage.removeItem(`unixgram-message-draft:${conversation.id}`)
      setAttachment(null)
      setReplyTo(null)
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setSending(false)
    }
  }
  const react = async (message: ChatMessage, emoji: string) => {
    if (!live || !conversation) return
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('unixgram_react_message', { conversationId: conversation.id, messageId: message.id, emoji })
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    }
  }
  if (!conversation) return <><header className="workspace-head"><div><span className="eyebrow">сообщения</span><h1>Диалоги</h1></div></header><div className="feed-state"><strong>диалог не выбран</strong><p>выберите переписку слева</p></div></>
  return (
    <>
      <header className="workspace-head chat-head"><div><span className="eyebrow">сообщения UnixGram</span><h1>{conversation.title}</h1></div><span className="sync-state">{live ? 'синхронизировано' : 'гость'}</span></header>
      <section className="chat-view" aria-busy={loading}>
        <button className="chat-view__peer" type="button" disabled={!conversation.username} onClick={() => conversation.username && onProfile(conversation.username)}>{conversation.avatarUrl ? <img className="conversation__avatar" src={conversation.avatarUrl} alt="" referrerPolicy="no-referrer" /> : <span className="conversation__avatar">{conversation.mark}</span>}<div><strong>{conversation.title}{conversation.verificationBadge && <span className="verified-mark" aria-label="Подтверждённый аккаунт">✓</span>}</strong><small>{conversation.type === 'GROUP' ? 'групповой чат' : conversation.isSelf ? 'избранное' : 'личный диалог'}{conversation.username ? ' · открыть профиль' : ''}</small></div></button>
        <div className="chat-messages">
          {loading && messages.length === 0 && <div className="feed-skeleton" role="status" aria-label="Загрузка сообщений"><span><i /><b /><em /></span></div>}
          {error && <div className="feed-state is-error" role="alert"><strong>сообщения не загрузились</strong><p>{error}</p><button type="button" onClick={() => void load()}>повторить</button></div>}
          {!loading && !error && messages.length === 0 && <div className="empty-state">{live ? 'в этом диалоге пока нет сообщений' : 'история сообщений доступна после входа в Windows-приложении'}</div>}
          {messages.map((message) => <article key={message.id} className={`chat-bubble ${message.mine ? 'is-outgoing' : 'is-incoming'}`}>
            {!message.mine && <b>{message.senderName}</b>}
            {message.reply && <blockquote><strong>{message.reply.authorName}</strong><span>{message.reply.content}</span></blockquote>}
            {message.content && <span className="chat-bubble__text">{message.content}</span>}
            {message.mediaUrl && message.mediaType?.startsWith('image') && <button className="chat-media-button" type="button" onClick={() => openMedia([message.mediaUrl!], 0, message.mediaLabel || 'Фото из сообщения')}><img className="chat-media" src={message.mediaUrl} alt={message.mediaLabel || 'Фото'} referrerPolicy="no-referrer" /></button>}
            {message.mediaUrl && message.mediaType?.startsWith('video') && <video className="chat-media" src={message.mediaUrl} controls preload="metadata" />}
            {message.mediaUrl && !message.mediaType?.startsWith('image') && !message.mediaType?.startsWith('video') && <SafeExternalLink className="chat-file" href={message.mediaUrl}><Paperclip size={15} /> {message.mediaLabel || 'Вложение'}</SafeExternalLink>}
            {message.mediaLabel && !message.mediaUrl && <em>{message.mediaLabel}</em>}
            {message.reactions.length > 0 && <div className="chat-reactions">{message.reactions.map((reaction) => <button className={reaction.reactedByViewer ? 'is-mine' : ''} type="button" key={reaction.emoji} onClick={() => void react(message, reaction.emoji)}>{reaction.emoji} {reaction.count}</button>)}</div>}
            <footer><span>{message.edited ? 'изм. · ' : ''}{message.time}</span>{message.mine && (message.read ? <CheckCheck size={15} aria-label="Прочитано" /> : <Check size={15} aria-label="Отправлено" />)}</footer>
            <div className="chat-bubble__actions"><button type="button" onClick={() => setReplyTo(message)} aria-label="Ответить"><CornerUpLeft size={14} /></button><button type="button" onClick={() => void react(message, '❤')} aria-label="Поставить реакцию">♡</button></div>
          </article>)}
        </div>
        <form className="composer chat-composer" onSubmit={(event) => void submit(event)}>
          {(replyTo || attachment) && <div className="composer-context">{replyTo && <span><CornerUpLeft size={15} /><b>{replyTo.senderName}</b><small>{replyTo.content || replyTo.mediaLabel}</small><button type="button" aria-label="Отменить ответ" onClick={() => setReplyTo(null)}><X size={14} /></button></span>}{attachment && <span><Paperclip size={15} /><b>{attachment.name}</b><small>{Math.ceil(attachment.size / 1024)} КБ</small><button type="button" aria-label="Убрать вложение" onClick={() => setAttachment(null)}><X size={14} /></button></span>}</div>}
          <input ref={fileRef} name="message-attachment" className="visually-hidden" aria-label="Выбрать вложение" type="file" accept="image/*,video/*,.pdf,.zip,.txt" onChange={(event) => setAttachment(event.target.files?.[0] ?? null)} />
          <button className="composer-attach" type="button" aria-label="Прикрепить файл" onClick={() => fileRef.current?.click()} disabled={!live || sending}><Paperclip size={18} /></button>
          <input name="message-text" aria-label="Сообщение" value={draft} onChange={(event) => { const next = event.target.value.slice(0, 4096); setDraft(next); if (conversation) { if (next) localStorage.setItem(`unixgram-message-draft:${conversation.id}`, next); else localStorage.removeItem(`unixgram-message-draft:${conversation.id}`) } }} placeholder={live ? 'Написать сообщение…' : 'Отправка доступна в приложении'} disabled={!live || sending} />
          <button type="submit" aria-label="Отправить" disabled={!live || sending || (!draft.trim() && !attachment)}><Send size={18} /></button>
        </form>
      </section>
    </>
  )
}

function PeopleView({ activeId, onSelect, profiles, loading, error }: { activeId: string; onSelect: (profile: ProfileWatchRow) => void; profiles: ProfileWatchRow[]; loading: boolean; error: string }) {
  return (
    <><header className="workspace-head"><div><span className="eyebrow">ваши подписки</span><h1>Сообщества</h1></div></header><section className="feed"><div className="section-title"><div><h2>Сообщества UnixGram</h2><p>живые данные текущего аккаунта</p></div><span>{profiles.length}</span></div>{loading && <div className="feed-skeleton" role="status"><span><i /><b /><em /></span></div>}{error && <div className="feed-state is-error"><strong>сообщества недоступны</strong><p>{error}</p></div>}<div className="people-grid">{profiles.map((profile) => <article className={normalizeHandle(profile.name) === activeId ? 'is-active' : ''} key={profile.id}><button type="button" onClick={() => onSelect(profile)}>{profile.avatarUrl ? <img className="profile-watch-badge" src={profile.avatarUrl} alt="" referrerPolicy="no-referrer" /> : <span className={`profile-watch-badge tone-${profile.tone}`}>{profile.name[0].toUpperCase()}</span>}<span><strong>{profile.displayName ?? profile.name}{profile.verificationBadge && <span className="verified-mark" aria-label="Подтверждённое сообщество">✓</span>}</strong><small>{profile.note}</small><b>{profile.activity}</b></span><em>открыть профиль</em></button></article>)}</div>{!loading && !error && profiles.length === 0 && <div className="empty-state">вы пока не состоите в сообществах UnixGram</div>}</section></>
  )
}

function StudioView({ settings, onToggle, onOpenSettings, activities, loading, error }: { settings: SettingsState; onToggle: (key: BooleanSettingKey) => void; onOpenSettings: () => void; activities: ActivityRow[]; loading: boolean; error: string }) {
  const uniqueTypes = new Set(activities.map((activity) => activity.type)).size
  const recent = activities.filter((activity) => !activity.time.includes('д.')).length
  return (
    <><header className="workspace-head"><div><span className="eyebrow">активность аккаунта</span><h1>Студия</h1></div><button className="primary-action" type="button" onClick={onOpenSettings}><Settings2 size={17} /> настройки</button></header><section className="studio-grid"><article><span>записей активности</span><strong>{activities.length}</strong><small>получено от UnixGram</small></article><article><span>недавних действий</span><strong>{recent}</strong><small>в текущей выборке</small></article><article><span>типов событий</span><strong>{uniqueTypes}</strong><small>без показа IP</small></article></section><section className="studio-panel"><div><h2>Последняя активность</h2><p>безопасность и действия текущего аккаунта</p></div>{loading && <div className="empty-state">загружаем активность…</div>}{error && <div className="feed-state is-error"><strong>активность недоступна</strong><p>{error}</p></div>}{activities.slice(0, 12).map((activity) => <div className="activity-row" key={activity.id}><span><strong>{activity.label}</strong><small>{activity.detail}</small></span><time>{activity.time}</time></div>)}{!loading && !error && activities.length === 0 && <div className="empty-state">активность аккаунта пока пуста</div>}</section><section className="studio-panel"><div><h2>Фоновая работа</h2></div><ToggleRow title="Автообновление" note={`проверка каждые ${settings.refreshRate}`} value={settings.autoRefresh} onClick={() => onToggle('autoRefresh')} /><ToggleRow title="Системные уведомления" note="покупки, ставки и передачи" value={settings.notifications} onClick={() => onToggle('notifications')} /><ToggleRow title="Экономия трафика" note="лёгкие ответы без тяжёлых превью" value={settings.dataSaver} onClick={() => onToggle('dataSaver')} /></section></>
  )
}

function ProfileView({ profile, summary, posts, onOpenGifts, onOpenSettings, onShare, onProfile, loading, error }: { profile: ProfileWatchRow; summary: ProfileSummary | null; posts: SocialPost[]; onOpenGifts: () => void; onOpenSettings: () => void; onShare: (post: SocialPost) => void; onProfile: (post: SocialPost) => void; loading: boolean; error: string }) {
  const openMedia = useContext(MediaViewerContext)
  const [activeTab, setActiveTab] = useState<'posts' | 'media'>('posts')
  const isLive = summary?.watch.name.toLowerCase() === profile.name.toLowerCase()
  const heading = isLive ? summary.watch.displayName ?? profile.name : profile.displayName ?? profile.name
  const note = isLive ? summary.bio : profile.note
  const giftsLabel = isLive ? summary.watch.gifts : profile.gifts
  const avatarUrl = isLive ? summary.watch.avatarUrl ?? profile.avatarUrl : profile.avatarUrl
  const coverUrl = isLive ? summary.watch.coverUrl ?? profile.coverUrl : profile.coverUrl
  const verificationBadge = isLive ? summary.watch.verificationBadge ?? profile.verificationBadge : profile.verificationBadge
  const premium = isLive ? summary.watch.premium : profile.premium
  const emojiStatus = isLive ? summary.watch.emojiStatus : profile.emojiStatus
  const media = posts.flatMap((post) => post.imageUrls.map((url) => ({ url, post })))
  if (loading && !summary) return <><header className="workspace-head"><div><span className="eyebrow">ваш unixgram</span><h1>Профиль</h1></div></header><div className="feed-skeleton" role="status" aria-label="Загрузка профиля"><span><i /><b /><em /></span></div></>
  if (error && !summary) return <><header className="workspace-head"><div><span className="eyebrow">ваш unixgram</span><h1>Профиль</h1></div></header><div className="feed-state is-error" role="alert"><strong>профиль недоступен</strong><p>{error}</p></div></>
  if (!summary) return <><header className="workspace-head"><div><span className="eyebrow">ваш unixgram</span><h1>Профиль</h1></div></header><div className="feed-state"><strong>профиль ещё не загружен</strong><p>обновите данные UnixGram или заново подтвердите вход</p><button type="button" onClick={onOpenSettings}>проверить сессию</button></div></>
  return (
    <>
      <header className="workspace-head profile-native-head"><div><h1>Профиль</h1></div><button className="icon-button" type="button" aria-label="Настройки профиля" onClick={onOpenSettings}><Settings2 size={19} /></button></header>
      <section className="profile-native">
        <button className="profile-native__cover" type="button" disabled={!coverUrl} onClick={() => coverUrl && openMedia([coverUrl], 0, `Обложка ${heading}`)} aria-label={coverUrl ? `Открыть обложку ${heading}` : 'Обложка отсутствует'}>{coverUrl && <img src={coverUrl} alt="" referrerPolicy="no-referrer" />}</button>
        <button className={`profile-native__avatar tone-${profile.tone}`} type="button" disabled={!avatarUrl} onClick={() => avatarUrl && openMedia([avatarUrl], 0, `Фото профиля ${heading}`)} aria-label={avatarUrl ? `Открыть фото профиля ${heading}` : 'Фото профиля отсутствует'}>{avatarUrl ? <img src={avatarUrl} alt="" referrerPolicy="no-referrer" /> : profile.name[0].toUpperCase()}</button>
        <div className="profile-native__actions"><button type="button" onClick={onOpenGifts}><Gift size={17} /> подарки</button><SafeExternalLink href={`https://unixgram.com/u/${normalizeHandle(profile.name)}`}><ExternalLink size={16} /> открыть в UnixGram</SafeExternalLink></div>
        <div className="profile-native__identity"><h2>{heading}<VerifiedBadge kind={verificationBadge} />{premium && <span className="premium-mark" title="Unix Premium" aria-label="Unix Premium">✦</span>}{emojiStatus && <span className="emoji-status">{emojiStatus}</span>}</h2><UnixLink username={profile.name} /><p>{note}</p>{isLive && summary.alternateUsernames && summary.alternateUsernames.length > 0 && <div className="profile-native__usernames">{summary.alternateUsernames.map((username) => <UnixLink key={username} username={username} />)}</div>}</div>
        <div className="profile-native__stats"><span><strong>{summary.postsCount?.toLocaleString('ru-RU') ?? '—'}</strong> постов</span><span><strong>{summary.followersCount?.toLocaleString('ru-RU') ?? '—'}</strong> подписчиков</span><span><strong>{summary.followingCount?.toLocaleString('ru-RU') ?? '—'}</strong> подписок</span><button type="button" onClick={onOpenGifts}><strong>{summary.giftCount?.toLocaleString('ru-RU') ?? giftsLabel}</strong> подарков</button></div>
        {summary.joinedAt && <small className="profile-native__joined">в UnixGram с {formatRelativeTime(summary.joinedAt)}</small>}
        <nav className="profile-native__tabs" role="tablist" aria-label="Разделы профиля">
          <button role="tab" aria-selected={activeTab === 'posts'} tabIndex={activeTab === 'posts' ? 0 : -1} className={activeTab === 'posts' ? 'is-active' : ''} type="button" onKeyDown={moveTabByArrow} onClick={() => setActiveTab('posts')}>Посты</button>
          <button type="button" onClick={onOpenGifts}>Подарки</button>
          <button role="tab" aria-selected={activeTab === 'media'} tabIndex={activeTab === 'media' ? 0 : -1} className={activeTab === 'media' ? 'is-active' : ''} type="button" onKeyDown={moveTabByArrow} onClick={() => setActiveTab('media')}>Медиа</button>
        </nav>
      </section>
      {activeTab === 'posts' ? (
        <section className="profile-posts profile-posts--native" role="tabpanel"><div className="unix-feed unix-feed--profile">{posts.map((post) => <UnixPostCard key={post.id} post={post} onShare={onShare} onProfile={onProfile} origin="profile" />)}</div>{!loading && posts.length === 0 && <div className="empty-state">у этого профиля пока нет доступных публикаций</div>}</section>
      ) : (
        <section className="profile-media" role="tabpanel" aria-label={`Медиа ${heading}`}>
          {media.map(({ url, post }, index) => <button key={`${post.id}-${url}`} type="button" onClick={() => openMedia(media.map((item) => item.url), index, `Медиа ${heading}`)}><img src={url} alt={`Фото из публикации ${post.displayName}`} loading="lazy" referrerPolicy="no-referrer" /></button>)}
          {!loading && media.length === 0 && <div className="empty-state">в загруженных публикациях нет фотографий</div>}
        </section>
      )}
    </>
  )
}

function MessageContext({ conversation }: { conversation: ConversationRow | null }) {
  if (!conversation) return <><header className="context-head"><span>Диалог</span><MessageSquareMore size={18} /></header><section className="context-section"><p className="context-copy">выберите переписку слева</p></section></>
  const conversationHref = conversation.username
    ? `https://unixgram.com/u/${conversation.username}`
    : 'https://unixgram.com/dashboard/messages'
  return <><header className="context-head"><span>Диалог</span><MessageSquareMore size={18} /></header><section className="profile-card">{conversation.avatarUrl ? <img className="profile-avatar" src={conversation.avatarUrl} alt="" referrerPolicy="no-referrer" /> : <div className="profile-avatar tone-violet">{conversation.mark[0]}</div>}<h2>{conversation.title}{conversation.verificationBadge && <span className="verified-mark" aria-label="Подтверждённый аккаунт">✓</span>}</h2><p className="context-copy">{conversation.type === 'GROUP' ? 'групповая переписка UnixGram' : conversation.isSelf ? 'ваши сохранённые сообщения' : 'личная переписка UnixGram'}</p><SafeExternalLink className="text-action" href={conversationHref}><ExternalLink size={16} /> {conversation.username ? 'открыть профиль' : 'открыть сообщения'}</SafeExternalLink></section><section className="context-section"><h3>Приватность</h3><p className="context-copy">текст диалогов используется только на экране переписки и не передаётся в Discord Rich Presence.</p></section></>
}

function App() {
  const isDesktopRuntime = '__TAURI_INTERNALS__' in window
  const [theme, setTheme] = useState<ThemeId>(() => {
    const stored = window.localStorage.getItem(themeStorageKey)
    return isThemeId(stored) ? stored : 'official-night'
  })
  const [settings, setSettings] = useState<SettingsState>(() => {
    const stored = window.localStorage.getItem(settingsStorageKey)
    if (!stored) return defaultSettings
    try {
      return { ...defaultSettings, ...(JSON.parse(stored) as Partial<SettingsState>) }
    } catch {
      return defaultSettings
    }
  })
  const [panelLayout, setPanelLayout] = useState(() => {
    const fallback = { rail: 216, messages: 336, context: 312 }
    const stored = window.localStorage.getItem(layoutStorageKey)
    if (!stored) return fallback
    try {
      const value = JSON.parse(stored) as Partial<typeof fallback>
      return {
        rail: Math.min(280, Math.max(184, Number(value.rail) || fallback.rail)),
        messages: Math.min(440, Math.max(280, Number(value.messages) || fallback.messages)),
        context: Math.min(420, Math.max(260, Number(value.context) || fallback.context)),
      }
    } catch {
      return fallback
    }
  })
  const [railExpanded, setRailExpanded] = useState(() => window.localStorage.getItem(railExpandedStorageKey) === 'true')
  const [view, setView] = useState<ViewId>(() => settings.launchTo)
  const [historyMode, setHistoryMode] = useState<HistoryMode>('activity')
  const [giftMode, setGiftMode] = useState<GiftMode>('account')
  const [settingsSection, setSettingsSection] = useState<SettingsSection>('appearance')
  const [query, setQuery] = useState('')
  const [activeEventId, setActiveEventId] = useState('e2')
  const [activeGiftId, setActiveGiftId] = useState('g2')
  const [activeProfileId, setActiveProfileId] = useState('p1')
  const [activeConversationId, setActiveConversationId] = useState('history')
  const [readConversationIds, setReadConversationIds] = useState<Set<string>>(() => new Set())
  const [lastUpdated, setLastUpdated] = useState('18:46')
  const [copied, setCopied] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [snapshot, setSnapshot] = useState<SyncSnapshot | null>(null)
  const [syncError, setSyncError] = useState('')
  const [inspectedProfile, setInspectedProfile] = useState<ProfileSummary | null>(null)
  const [inspectedGiftRows, setInspectedGiftRows] = useState<GiftRow[]>([])
  const [inspectedProfilePosts, setInspectedProfilePosts] = useState<SocialPost[]>([])
  const [profileInspectLoading, setProfileInspectLoading] = useState(false)
  const [profileInspectError, setProfileInspectError] = useState('')
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null)
  const [livePosts, setLivePosts] = useState<SocialPost[]>([])
  const [feedCursor, setFeedCursor] = useState<string | null>(null)
  const [feedHasMore, setFeedHasMore] = useState(false)
  const [feedFollowing, setFeedFollowing] = useState(false)
  const [feedLoading, setFeedLoading] = useState(false)
  const [feedError, setFeedError] = useState('')
  const [sections, setSections] = useState<DesktopSections | null>(null)
  const [sectionsLoading, setSectionsLoading] = useState(false)
  const [sectionsError, setSectionsError] = useState('')
  const [searchPayload, setSearchPayload] = useState<unknown>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [toast, setToast] = useState('')
  const [mediaViewer, setMediaViewer] = useState<MediaViewerState>(null)
  const [bootInfo, setBootInfo] = useState<BootInfo | null>(null)
  const [discordStatus, setDiscordStatus] = useState('выключено')
  const [online, setOnline] = useState(() => navigator.onLine)
  const [splashReady, setSplashReady] = useState(false)
  const [previewSession, setPreviewSession] = useState<SessionInfo | null>(() => {
    if ('__TAURI_INTERNALS__' in window) return null
    const stored = window.sessionStorage.getItem(previewSessionStorageKey)
    if (!stored) return null
    try {
      return JSON.parse(stored) as SessionInfo
    } catch {
      return null
    }
  })
  const checkedOnLaunch = useRef(false)
  const autoFeedLoaded = useRef(false)
  const feedLoadingRef = useRef(false)
  const sectionsLoadingRef = useRef(false)
  const profileRequestRef = useRef(0)
  const deferredQuery = useDeferredValue(query)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.dataset.largeText = settings.largeText ? 'true' : 'false'
    document.documentElement.dataset.scale = settings.fontScale
    document.documentElement.dataset.density = settings.compact ? 'compact' : 'comfortable'
    document.documentElement.dataset.links = settings.openLinksExternally ? 'enabled' : 'disabled'
    document.documentElement.dataset.saver = settings.dataSaver ? 'on' : 'off'
    document.documentElement.dataset.motion = settings.reducedMotion ? 'reduced' : 'full'
    document.documentElement.dataset.titlebar = settings.titlebarStyle
    window.localStorage.setItem(themeStorageKey, theme)
  }, [theme, settings.compact, settings.dataSaver, settings.fontScale, settings.largeText, settings.openLinksExternally, settings.reducedMotion, settings.titlebarStyle])

  useEffect(() => {
    window.localStorage.setItem(settingsStorageKey, JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    window.localStorage.setItem(layoutStorageKey, JSON.stringify(panelLayout))
  }, [panelLayout])

  useEffect(() => {
    window.localStorage.setItem(railExpandedStorageKey, String(railExpanded))
  }, [railExpanded])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 4_000)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (!('__TAURI_INTERNALS__' in window)) return
    let live = true
    const timer = window.setTimeout(() => {
      void import('@tauri-apps/api/core')
        .then(({ invoke }) =>
          invoke<string>('discord_presence', {
            enabled: settings.discordPresence,
            clientId: settings.discordClientId,
            section: viewLabel(view),
            showSection: settings.discordShowSection,
          }),
        )
        .then((status) => live && setDiscordStatus(status))
        .catch((error) => live && setDiscordStatus(error instanceof Error ? error.message : String(error)))
    }, 450)
    return () => {
      live = false
      window.clearTimeout(timer)
    }
  }, [settings.discordClientId, settings.discordPresence, settings.discordShowSection, view])

  useEffect(() => {
    let live = true
    void import('@tauri-apps/api/core')
      .then(({ invoke }) => invoke<BootInfo>('desktop_boot_info'))
      .then((info) => live && setBootInfo(info))
      .catch(() =>
        live &&
        setBootInfo({
          channel: 'гостевой режим',
          protocol: 'локальная оболочка',
          themes: 9,
          status: 'guest',
        }),
      )
    return () => {
      live = false
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => setSplashReady(true), 1600)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (isDesktopRuntime) return
    if (previewSession) {
      window.sessionStorage.setItem(previewSessionStorageKey, JSON.stringify(previewSession))
    } else {
      window.sessionStorage.removeItem(previewSessionStorageKey)
    }
  }, [isDesktopRuntime, previewSession])

  useEffect(() => {
    const handleSnapshot = (event: Event) => {
      const next = (event as CustomEvent<SyncSnapshot>).detail
      if (next) setSnapshot(next)
    }
    window.addEventListener('unixgram-snapshot-updated', handleSnapshot)
    return () => window.removeEventListener('unixgram-snapshot-updated', handleSnapshot)
  }, [])

  const liveConversations = useMemo(() => buildConversationRows(sections?.messages), [sections?.messages])
  const liveNotifications = useMemo(() => buildNotificationRows(sections?.notifications), [sections?.notifications])
  const liveCommunities = useMemo(() => buildCommunityRows(sections?.communities), [sections?.communities])
  const liveActivities = useMemo(() => buildActivityRows(sections?.activity), [sections?.activity])
  const catalogGifts = useMemo(() => buildGiftCatalogRows(sections?.giftCollections), [sections?.giftCollections])
  const visibleConversations = useMemo(
    () => (isDesktopRuntime ? liveConversations : conversations).map((conversation) => readConversationIds.has(conversation.id) ? { ...conversation, unreadCount: 0 } : conversation),
    [isDesktopRuntime, liveConversations, readConversationIds],
  )
  const visibleEvents = isDesktopRuntime ? liveNotifications : events
  const unreadNotifications = readNumber(unwrapPayload(sections?.notifications), 'unreadCount') ?? 0
  const sectionWarning = useCallback((label: string) => sections?.warnings?.find((warning) => warning.startsWith(`${label}:`))?.replace(`${label}:`, '').trim() ?? (!sections ? sectionsError : ''), [sections, sectionsError])

  const filteredEvents = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase()
    const maxAge = settings.timelineRange === '24h' ? 24 : settings.timelineRange === '7d' ? 168 : 720
    const inRange = visibleEvents.filter((event) => event.ageHours <= maxAge)
    const source =
      historyMode === 'activity'
        ? inRange
        : historyMode === 'profiles'
          ? inRange.filter((event) => event.kind === 'профиль' || event.kind === 'покупка')
          : inRange.filter((event) => event.kind === 'ставка' || event.kind === 'покупка')
    if (!needle) return source
    return source.filter((event) => Object.values(event).join(' ').toLowerCase().includes(needle))
  }, [deferredQuery, historyMode, settings.timelineRange, visibleEvents])

  const liveProfileSummary = useMemo(
    () => buildProfileSummary(snapshot, settings.syncHandle),
    [settings.syncHandle, snapshot],
  )
  const profileViewSummary = inspectedProfile ?? liveProfileSummary
  const mergedProfiles = useMemo(() => mergeProfiles(liveProfileSummary, !isDesktopRuntime), [isDesktopRuntime, liveProfileSummary])
  const syncedGiftRows = useMemo(() => buildGiftRows(snapshot, settings.syncHandle), [settings.syncHandle, snapshot])
  const profilePosts = useMemo(
    () => inspectedProfile ? inspectedProfilePosts : buildSocialPosts(snapshot?.feed),
    [inspectedProfile, inspectedProfilePosts, snapshot?.feed],
  )
  const socialPosts = useMemo(
    () => livePosts.length > 0 ? livePosts : buildSocialPosts(snapshot?.feed, !isDesktopRuntime),
    [isDesktopRuntime, livePosts, snapshot?.feed],
  )

  const activeEvent = visibleEvents.find((event) => event.id === activeEventId) ?? visibleEvents[0] ?? { id: 'empty', icon: 'U', title: 'уведомлений пока нет', actor: '', target: '', value: '', time: '', tone: 'blue', kind: 'уведомление', ageHours: 0 }
  const activeGift = (isDesktopRuntime ? catalogGifts : gifts).find((giftItem) => giftItem.id === activeGiftId) ?? (isDesktopRuntime ? catalogGifts[0] : gifts[0]) ?? { id: 'empty', mark: 'G', name: 'подарок не выбран', owner: '', price: 'без цены', delta: '', tone: 'blue' }
  const activeSyncedGift = syncedGiftRows.find((giftItem) => giftItem.id === activeGiftId) ?? null
  const activeProfile = inspectedProfile?.watch ?? mergedProfiles.find((row) => normalizeHandle(row.name) === activeProfileId) ?? liveProfileSummary?.watch ?? mergedProfiles[0] ?? { id: 'empty', name: normalizeHandle(settings.syncHandle) || 'profile', note: 'профиль загружается', activity: '', gifts: '0 подарков', tone: 'blue' }
  const activeSession = isDesktopRuntime ? sessionInfo : previewSession
  const sessionProbeReady = isDesktopRuntime ? sessionInfo !== null : true
  const shellUnlocked = Boolean(activeSession?.connected)
  const showStartupSplash = !splashReady || !sessionProbeReady || !bootInfo

  const updateSetting = useCallback(<K extends keyof SettingsState,>(key: K, value: SettingsState[K]) => {
    setSettings((current) => ({ ...current, [key]: value }))
  }, [])

  const unlockPreviewSession = useCallback(() => {
    const username = normalizeHandle(settings.syncHandle) || 'guest'
    const next: SessionInfo = {
      connected: true,
      username,
      storage: 'Browser Session',
      message: 'гостевая сессия активна',
    }
    setPreviewSession(next)
    setSettings((current) => current.syncHandle ? current : { ...current, syncHandle: username })
    setToast('гостевая сессия включена')
  }, [settings.syncHandle])

  const toggleSetting = (key: BooleanSettingKey) => {
    if (key === 'discordPresence' && !settings.discordPresence && !/^\d{17,24}$/.test(settings.discordClientId)) {
      setSettingsSection('integrations')
      setToast('сначала укажите Discord Application ID')
      return
    }
    if (key === 'notifications' && !settings.notifications && 'Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission().then((permission) => {
        if (permission !== 'granted') setToast('системные уведомления не разрешены Windows')
      })
    }
    setSettings((current) => ({ ...current, [key]: !current[key] }))
  }

  const chooseView = (next: ViewId) => {
    startTransition(() => {
      setView(next)
      if (!settings.rememberSearch) setQuery('')
      if (next === 'settings') setSettingsSection('appearance')
    })
  }

  const markConversationRead = useCallback((conversationId: string) => {
    setReadConversationIds((current) => {
      if (current.has(conversationId)) return current
      const next = new Set(current)
      next.add(conversationId)
      return next
    })
  }, [])

  const openSearchedProfile = async (profile: ProfileWatchRow, destination: ViewId = 'profile', seedPosts: SocialPost[] = []) => {
    const requestId = profileRequestRef.current + 1
    profileRequestRef.current = requestId
    setActiveProfileId(normalizeHandle(profile.name))
    setInspectedProfile({ watch: profile, bio: profile.note })
    setInspectedGiftRows([])
    setInspectedProfilePosts(seedPosts)
    setProfileInspectError('')
    chooseView(destination)
    if (!isDesktopRuntime) return
    setProfileInspectLoading(true)
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const fresh = await invoke<SyncSnapshot>('unixgram_sync', {
        handle: profile.name,
        timeoutSeconds: Number(settings.requestTimeout),
        retryCount: Number(settings.retryCount),
        dataSaver: settings.dataSaver,
      })
      const summary = buildProfileSummary(fresh, profile.name)
      if (!summary) throw new Error('UnixGram вернул пустой профиль')
      if (profileRequestRef.current !== requestId) return
      setInspectedProfile(summary)
      setInspectedGiftRows(buildGiftRows(fresh, profile.name))
      setInspectedProfilePosts(buildSocialPosts(fresh.feed))
    } catch (reason) {
      if (profileRequestRef.current !== requestId) return
      setProfileInspectError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      if (profileRequestRef.current === requestId) setProfileInspectLoading(false)
    }
  }

  const copyCurrent = async () => {
    const selectedGift = activeSyncedGift ?? activeGift
    const handle = view === 'people' || view === 'profile' || (view === 'history' && historyMode === 'profiles')
      ? normalizeHandle(activeProfile.name)
      : normalizeHandle(activeEvent.actor)
    const url = view === 'gifts'
      ? selectedGift.slug ? `https://unixgram.com/gifts/${encodeURIComponent(selectedGift.slug)}` : `https://unixgram.com/gift/${encodeURIComponent(selectedGift.id)}`
      : `https://unixgram.com/u/${handle}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setToast('ссылка UnixGram скопирована')
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setToast('не удалось скопировать ссылку')
    }
  }

  const sharePost = async (post: SocialPost) => {
    try {
      await navigator.clipboard.writeText(`https://unixgram.com/post/${encodeURIComponent(post.id)}`)
      setCopied(true)
      setToast('ссылка на публикацию скопирована')
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setToast('не удалось скопировать ссылку')
    }
  }

  const loadFeed = useCallback(async (options?: { append?: boolean; following?: boolean }) => {
    if (!isDesktopRuntime || feedLoadingRef.current) return
    const append = options?.append ?? false
    const following = options?.following ?? feedFollowing
    feedLoadingRef.current = true
    setFeedLoading(true)
    setFeedError('')
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const payload = await invoke<unknown>('unixgram_feed', {
        cursor: append ? feedCursor : null,
        limit: settings.dataSaver ? 12 : 30,
        following,
        timeoutSeconds: Number(settings.requestTimeout),
        retryCount: Number(settings.retryCount),
      })
      const nextPosts = buildSocialPosts(payload)
      setLivePosts((current) => {
        const source = append ? [...current, ...nextPosts] : nextPosts
        const seen = new Set<string>()
        return source.filter((post) => !seen.has(post.id) && Boolean(seen.add(post.id)))
      })
      const pageInfo = readFeedPageInfo(payload)
      setFeedCursor(pageInfo.cursor)
      setFeedHasMore(pageInfo.hasMore)
      setFeedFollowing(following)
      setSessionInfo((current) => current ? { ...current, connected: true } : current)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setFeedError(message)
      if (/сесс|войд|auth|401/i.test(message)) {
        setSessionInfo((current) => ({ connected: false, username: current?.username, storage: 'Windows Credential Manager', message }))
      }
    } finally {
      feedLoadingRef.current = false
      setFeedLoading(false)
    }
  }, [feedCursor, feedFollowing, isDesktopRuntime, settings.dataSaver, settings.requestTimeout, settings.retryCount])

  const publishPost = useCallback(async (content: string, images: File[]) => {
    if (!isDesktopRuntime || !sessionInfo?.connected) throw new Error('войдите в UnixGram, чтобы публиковать записи')
    const encodedImages = await Promise.all(images.map(async (file) => ({
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      bytes: Array.from(new Uint8Array(await file.arrayBuffer())),
    })))
    const { invoke } = await import('@tauri-apps/api/core')
    const payload = await invoke<unknown>('unixgram_create_post', { request: {
      content,
      images: encodedImages,
      clientPostId: globalThis.crypto?.randomUUID?.() ?? `desktop-${Date.now()}`,
    } })
    const created = readValue(payload, 'post') ?? payload
    const rows = buildSocialPosts({ posts: [created] })
    if (rows.length > 0) setLivePosts((current) => [rows[0], ...current.filter((post) => post.id !== rows[0].id)])
    else await loadFeed({ following: false })
    setFeedFollowing(false)
    setToast('публикация появилась в ленте')
  }, [isDesktopRuntime, loadFeed, sessionInfo?.connected])

  const loadSections = useCallback(async () => {
    if (!isDesktopRuntime || sectionsLoadingRef.current) return
    sectionsLoadingRef.current = true
    setSectionsLoading(true)
    setSectionsError('')
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const payload = await invoke<DesktopSections>('unixgram_sections')
      setSections(payload)
      if (payload.warnings?.length) setSectionsError(payload.warnings.join(' · '))
    } catch (reason) {
      setSectionsError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      sectionsLoadingRef.current = false
      setSectionsLoading(false)
    }
  }, [isDesktopRuntime])

  useEffect(() => {
    if (!isDesktopRuntime) return
    let live = true
    void import('@tauri-apps/api/core')
      .then(({ invoke }) => invoke<SessionInfo>('unixgram_session_status'))
      .then((info) => {
        if (!live) return
        setSessionInfo(info)
        const username = normalizeHandle(info.username || '')
        if (info.connected && username) {
          setSettings((current) => current.syncHandle ? current : { ...current, syncHandle: username })
        }
      })
      .catch((error) => live && setSessionInfo({ connected: false, storage: 'Windows Credential Manager', message: error instanceof Error ? error.message : String(error) }))
    return () => { live = false }
  }, [isDesktopRuntime])

  useEffect(() => {
    const handleSessionChange = (event: Event) => {
      const info = (event as CustomEvent<SessionInfo>).detail
      if (!info) return
      setSessionInfo(info)
      if (info.connected) {
        const username = normalizeHandle(info.username || '')
        if (username) setSettings((current) => current.syncHandle ? current : { ...current, syncHandle: username })
        autoFeedLoaded.current = false
      } else {
        autoFeedLoaded.current = false
        setLivePosts([])
        setFeedCursor(null)
        setFeedHasMore(false)
        setSections(null)
        setSearchPayload(null)
      }
    }
    window.addEventListener('unixgram-session-changed', handleSessionChange)
    return () => window.removeEventListener('unixgram-session-changed', handleSessionChange)
  }, [])

  useEffect(() => {
    if (!sessionInfo?.connected || autoFeedLoaded.current) return
    autoFeedLoaded.current = true
    void loadFeed({ following: false })
    void loadSections()
  }, [loadFeed, loadSections, sessionInfo?.connected])

  useEffect(() => {
    if (!isDesktopRuntime || !shellUnlocked || view !== 'search') return
    const clean = deferredQuery.trim()
    if (clean.length < 2) {
      // Reset stale remote results when the search input no longer forms a valid request.
      // oxlint-disable-next-line react/set-state-in-effect
      setSearchPayload(null)
      setSearchError('')
      setSearchLoading(false)
      return
    }
    let live = true
    const timer = window.setTimeout(() => {
      setSearchLoading(true)
      setSearchError('')
      void import('@tauri-apps/api/core')
        .then(({ invoke }) => invoke<unknown>('unixgram_search', { query: clean }))
        .then((payload) => { if (live) setSearchPayload(payload) })
        .catch((reason) => { if (live) setSearchError(reason instanceof Error ? reason.message : String(reason)) })
        .finally(() => { if (live) setSearchLoading(false) })
    }, 350)
    return () => { live = false; window.clearTimeout(timer) }
  }, [deferredQuery, isDesktopRuntime, shellUnlocked, view])

  const refreshNow = useCallback(async () => {
    if (refreshing) return
    setRefreshing(true)
    setSyncError('')
    const zone = settings.timeZoneMode === 'msk' ? 'Europe/Moscow' : undefined
    try {
      if ('__TAURI_INTERNALS__' in window) {
        await Promise.all([loadFeed({ following: feedFollowing }), loadSections()])
        const { invoke } = await import('@tauri-apps/api/core')
        if (normalizeHandle(settings.syncHandle)) {
          const fresh = await invoke<SyncSnapshot>('unixgram_sync', {
            handle: settings.syncHandle,
            timeoutSeconds: Number(settings.requestTimeout),
            retryCount: Number(settings.retryCount),
            dataSaver: settings.dataSaver,
          })
          setSnapshot(fresh)
          if (fresh.warnings?.length) setToast(fresh.warnings.join(' · '))
        }
      } else {
        await new Promise((resolve) => window.setTimeout(resolve, 450))
      }
      setLastUpdated(
        new Date().toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: zone,
        }),
      )
      if (settings.soundEffects && 'AudioContext' in window) {
        const audio = new AudioContext()
        const oscillator = audio.createOscillator()
        const gain = audio.createGain()
        gain.gain.setValueAtTime(0.04, audio.currentTime)
        oscillator.frequency.setValueAtTime(680, audio.currentTime)
        oscillator.connect(gain).connect(audio.destination)
        oscillator.start()
        oscillator.stop(audio.currentTime + 0.07)
        oscillator.onended = () => void audio.close()
      }
      if (
        settings.notifications &&
        settings.desktopToasts &&
        (settings.purchaseAlerts || settings.bidAlerts || settings.transferAlerts) &&
        document.visibilityState === 'hidden' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        const enabledSignals = [
          settings.purchaseAlerts && 'покупки',
          settings.bidAlerts && 'ставки',
          settings.transferAlerts && 'передачи',
        ].filter(Boolean)
        new Notification('UnixGram Desktop', {
          body: enabledSignals.length > 0
            ? `обновлены профиль и лента · отслеживаем: ${enabledSignals.join(', ')}`
            : 'данные профиля и ленты обновлены',
        })
      }
      setToast('данные UnixGram обновлены')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setSyncError(message)
      setToast(message)
    } finally {
      setRefreshing(false)
    }
  }, [feedFollowing, loadFeed, loadSections, refreshing, settings.bidAlerts, settings.dataSaver, settings.desktopToasts, settings.notifications, settings.purchaseAlerts, settings.requestTimeout, settings.retryCount, settings.soundEffects, settings.syncHandle, settings.timeZoneMode, settings.transferAlerts])

  useEffect(() => {
    if (visibleConversations.length === 0) return
    if (!visibleConversations.some((conversation) => conversation.id === activeConversationId)) {
      // Keep selection valid when the remote conversation list changes after synchronization.
      // oxlint-disable-next-line react/set-state-in-effect
      setActiveConversationId(visibleConversations[0].id)
    }
  }, [activeConversationId, visibleConversations])

  const changeFeedTab = useCallback((following: boolean) => {
    if (following === feedFollowing || feedLoadingRef.current) return
    setFeedFollowing(following)
    setLivePosts([])
    setFeedCursor(null)
    setFeedHasMore(false)
    void loadFeed({ following })
  }, [feedFollowing, loadFeed])

  useEffect(() => {
    if (checkedOnLaunch.current || !settings.checkUpdatesOnLaunch || (isDesktopRuntime && !shellUnlocked)) return
    checkedOnLaunch.current = true
    void refreshNow()
  }, [isDesktopRuntime, refreshNow, settings.checkUpdatesOnLaunch, shellUnlocked])

  useEffect(() => {
    if (!settings.autoRefresh || (isDesktopRuntime && !shellUnlocked)) return
    const delay = settings.refreshRate === '30s' ? 30_000 : settings.refreshRate === '1m' ? 60_000 : 300_000
    const timer = window.setInterval(() => {
      void refreshNow()
    }, delay)
    return () => window.clearInterval(timer)
  }, [isDesktopRuntime, refreshNow, settings.autoRefresh, settings.refreshRate, shellUnlocked])

  const showMessagePane = view === 'messages'
  const showContextPane = settings.keepRightPanel && view !== 'settings' && view !== 'profile' && view !== 'premium'
  const shellClassName = `app-shell ${railExpanded && !showMessagePane ? 'is-rail-expanded' : 'is-rail-collapsed'} ${settings.largeText ? 'is-large-text' : ''} ${showContextPane ? 'has-context' : 'no-context'} ${view === 'settings' || view === 'premium' ? 'is-settings' : showMessagePane ? 'is-messages' : 'is-content'}`
  const toastNode = toast && <div className="toast" role="status" aria-live="polite"><span>{toast}</span><button type="button" aria-label="Закрыть уведомление" onClick={() => setToast('')}><X size={15} /></button></div>
  const openMedia = useCallback((urls: string[], index = 0, label = 'Фото UnixGram') => {
    const safeUrls = urls.map(safeMediaUrl).filter(Boolean)
    if (safeUrls.length > 0) setMediaViewer({ urls: safeUrls, index: Math.min(Math.max(index, 0), safeUrls.length - 1), label })
  }, [])
  const closeMedia = useCallback(() => setMediaViewer(null), [])
  const stepMedia = useCallback((offset: number) => setMediaViewer((current) => current ? { ...current, index: (current.index + offset + current.urls.length) % current.urls.length } : null), [])

  return (
    <ExternalLinksContext.Provider value={settings.openLinksExternally}>
    <MediaViewerContext.Provider value={openMedia}>
    {showStartupSplash ? (
      <>
        <StartupSplash bootInfo={bootInfo} desktopRuntime={isDesktopRuntime} />
        {toastNode}
      </>
    ) : !shellUnlocked ? (
      <>
        <AuthGate
          bootInfo={bootInfo}
          syncHandle={settings.syncHandle}
          onSyncHandle={(value) => updateSetting('syncHandle', value)}
          onToast={setToast}
          previewMode={!isDesktopRuntime}
          onPreviewUnlock={unlockPreviewSession}
        />
        {toastNode}
      </>
    ) : (
    <div
      className={shellClassName}
      style={{
        '--rail-width': `${showMessagePane ? 72 : railExpanded ? 216 : 72}px`,
        '--messages-width': `${panelLayout.messages}px`,
        '--context-width': `${panelLayout.context}px`,
      } as React.CSSProperties}
    >
      <a className="skip-link" href="#workspace">
        к содержимому
      </a>

      {!online && (
        <div className="connection-banner" role="status" aria-live="polite">
          <span aria-hidden="true" />
          <strong>нет сети</strong>
          <small>показываем последние синхронизированные данные</small>
        </div>
      )}

      <aside className="app-rail" aria-label="Навигация UnixGram">
        <button className="rail-account" type="button" aria-label={`Профиль @${liveProfileSummary?.watch.name ?? settings.syncHandle ?? 'unixgram'}`} onClick={() => chooseView('profile')}>
          {liveProfileSummary?.watch.avatarUrl
            ? <img src={liveProfileSummary.watch.avatarUrl} alt="" referrerPolicy="no-referrer" />
            : <span>{(liveProfileSummary?.watch.displayName ?? liveProfileSummary?.watch.name ?? 'U').slice(0, 1).toUpperCase()}</span>}
          <span className="rail-account__copy"><strong>{liveProfileSummary?.watch.displayName ?? liveProfileSummary?.watch.name ?? 'UnixGram'}</strong><small>@{liveProfileSummary?.watch.name ?? settings.syncHandle ?? 'unixgram'}</small></span>
        </button>
        <nav className="rail-nav">
          {railItems.map(({ label, Icon, view: target }) => {
            const badge = label === 'Уведомления' && unreadNotifications > 0 ? String(Math.min(unreadNotifications, 99)) : ''
            return (
            <button
              key={label}
              className={`rail-item ${target === view ? 'is-active' : ''}`}
              type="button"
              aria-label={label === 'Подарки' ? 'Подарки UnixGram' : label}
              aria-current={target === view ? 'page' : undefined}
              onClick={() => {
                if (target === 'profile') {
                  setInspectedProfile(null)
                  setInspectedGiftRows([])
                  setInspectedProfilePosts([])
                  setProfileInspectError('')
                }
                chooseView(target)
              }}
            >
              <span className="rail-icon">
                <Icon size={22} strokeWidth={1.95} />
                {badge && <b>{badge}</b>}
              </span>
              <span>{label}</span>
            </button>
            )
          })}
        </nav>
        <div className="rail-grow" />
        <footer className="rail-footer">
          <span className={`rail-connection ${online ? 'is-online' : ''}`} title={online ? 'Подключено' : 'Нет подключения'}><i /> <span>{online ? 'Подключено' : 'Нет подключения'}</span></span>
          <button aria-label="Настройки клиента" className={`rail-item ${view === 'settings' ? 'is-active' : ''}`} aria-current={view === 'settings' ? 'page' : undefined} type="button" onClick={() => chooseView('settings')}><span className="rail-icon"><Settings2 size={22} strokeWidth={1.95} /></span><span>Настройки</span></button>
          {!showMessagePane && <button className="rail-toggle" type="button" aria-label={railExpanded ? 'Свернуть навигацию' : 'Развернуть навигацию'} aria-expanded={railExpanded} onClick={() => setRailExpanded((current) => !current)}>{railExpanded ? <ChevronLeftIcon size={17} /> : <ChevronRightIcon size={17} />}<span>{railExpanded ? 'Свернуть' : 'Развернуть'}</span></button>}
        </footer>
      </aside>

      {!showMessagePane && railExpanded && (
        <PanelResizeHandle
          className="panel-resizer--rail"
          label="Изменить ширину навигации"
          value={panelLayout.rail}
          min={184}
          max={280}
          onChange={(rail) => setPanelLayout((current) => ({ ...current, rail }))}
        />
      )}

      {showMessagePane && <aside className="message-pane">
        <header className="message-pane__head">
          <div className="mini-brand"><img src="/unixgram-mark.svg" alt="" /></div>
          <strong>UnixGram</strong>
          <button className="icon-button" type="button" aria-label="Новое сообщение" onClick={() => chooseView('messages')}>
            <MessageCirclePlus size={18} />
          </button>
          <button className="icon-button" type="button" aria-label="Быстрый поиск" onClick={() => chooseView('search')}>
            <Search size={18} />
          </button>
        </header>
        <label className="native-search">
          <Search size={18} />
          <input
            name="native-global-search"
            aria-label="Поиск по UnixGram"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск по профилям, постам и подаркам"
          />
          {query && (
            <button type="button" aria-label="Очистить поиск" onClick={() => setQuery('')}>
              <X size={15} />
            </button>
          )}
        </label>
        <div className="pane-tabs" role="tablist" aria-label="Разделы">
          <button role="tab" aria-selected={false} tabIndex={-1} type="button" onKeyDown={moveTabByArrow} onClick={() => chooseView('history')}>
            Обзор
          </button>
          <button role="tab" aria-selected={view === 'messages'} tabIndex={view === 'messages' ? 0 : -1} className={view === 'messages' ? 'is-active' : ''} type="button" onKeyDown={moveTabByArrow} onClick={() => chooseView('messages')}>
            Сообщения
          </button>
          <button role="tab" aria-selected={false} tabIndex={-1} type="button" onKeyDown={moveTabByArrow} onClick={() => chooseView('feed')}>
            Лента
          </button>
        </div>
        <div className="conversation-list">
          {sectionsLoading && visibleConversations.length === 0 && <div className="pane-state">загружаем диалоги…</div>}
          {!sectionsLoading && sectionWarning('сообщения') && <div className="pane-state is-error">{sectionWarning('сообщения')}</div>}
          {visibleConversations.map((item) => (
            <button
              key={item.id}
              className={`conversation ${activeConversationId === item.id ? 'is-active' : ''}`}
              type="button"
              onClick={() => {
                setActiveConversationId(item.id)
                chooseView('messages')
              }}
            >
              {item.avatarUrl ? <img className="conversation__avatar" src={item.avatarUrl} alt="" referrerPolicy="no-referrer" /> : <span className="conversation__avatar">{item.mark}</span>}
              <span className="conversation__body">
                <span>
                  <strong>{item.title}{item.verificationBadge && <span className="verified-mark" aria-label="Подтверждённый аккаунт">✓</span>}</strong>
                  <time>{item.time}</time>
                </span>
                <small>{item.text}{Boolean(item.unreadCount) && <b className="unread-pill">{item.unreadCount}</b>}</small>
              </span>
            </button>
          ))}
          {!sectionsLoading && !sectionWarning('сообщения') && visibleConversations.length === 0 && <div className="pane-state">диалогов пока нет</div>}
        </div>
      </aside>}

      {showMessagePane && (
        <PanelResizeHandle
          className="panel-resizer--messages"
          label="Изменить ширину списка диалогов"
          value={panelLayout.messages}
          min={280}
          max={440}
          onChange={(messages) => setPanelLayout((current) => ({ ...current, messages }))}
        />
      )}

      <main className="workspace" id="workspace" tabIndex={-1}>
        {view === 'feed' && <FeedView posts={socialPosts} onShare={sharePost} onProfile={(post) => void openSearchedProfile({ id: `post-${post.username}`, name: post.username, displayName: post.displayName, note: 'профиль из ленты UnixGram', activity: 'публикация в ленте', gifts: 'подарки загружаются', tone: post.tone, avatarUrl: post.avatarUrl, verificationBadge: post.verificationBadge, premium: post.premium, emojiStatus: post.emojiStatus }, 'profile', [post])} loading={feedLoading} error={feedError} hasMore={feedHasMore} isPreview={!isDesktopRuntime} canPublish={isDesktopRuntime && Boolean(sessionInfo?.connected)} following={feedFollowing} onReload={() => void loadFeed({ following: feedFollowing })} onLoadMore={() => void loadFeed({ append: true, following: feedFollowing })} onTab={changeFeedTab} onOpenSearch={() => chooseView('search')} onOpenTags={() => { setQuery('#'); chooseView('search') }} onPublish={publishPost} viewer={liveProfileSummary?.watch ?? null} />}
        {view === 'search' && (
          <SearchView
            query={query}
            onQuery={setQuery}
            onGift={(id) => { setActiveGiftId(id); chooseView('gifts') }}
            onProfile={(profile) => { void openSearchedProfile(profile) }}
            unified={settings.unifiedSearchBeta}
            giftRows={isDesktopRuntime ? catalogGifts : gifts}
            profiles={mergedProfiles}
            remotePayload={searchPayload}
            loading={searchLoading}
            error={searchError}
            live={isDesktopRuntime}
          />
        )}
        {view === 'history' && (
          <HistoryView
            events={filteredEvents}
            historyMode={historyMode}
            onHistoryMode={setHistoryMode}
            activeId={activeEventId}
            onSelect={setActiveEventId}
            activeProfileId={activeProfileId}
            onSelectProfile={setActiveProfileId}
            lastUpdated={lastUpdated}
            onRefresh={refreshNow}
            refreshing={refreshing}
            synced={Boolean(snapshot)}
            settings={settings}
            profileRows={isDesktopRuntime ? liveCommunities : profileWatchRows}
            loading={sectionsLoading}
            error={sectionWarning('уведомления')}
          />
        )}
        {view === 'messages' && <MessagesView conversation={visibleConversations.find((item) => item.id === activeConversationId) ?? visibleConversations[0] ?? null} live={isDesktopRuntime} viewerId={activeSession?.userId} onRead={markConversationRead} onProfile={(username) => void openSearchedProfile({ id: `chat-${username}`, name: username, note: 'профиль из переписки UnixGram', activity: 'активный диалог', gifts: 'подарки загружаются', tone: 'violet' })} />}
        {view === 'people' && <PeopleView activeId={activeProfileId} onSelect={(profile) => void openSearchedProfile(profile)} profiles={isDesktopRuntime ? liveCommunities : mergedProfiles} loading={sectionsLoading} error={sectionWarning('сообщества')} />}
        {view === 'studio' && <StudioView settings={settings} onToggle={toggleSetting} onOpenSettings={() => chooseView('settings')} activities={liveActivities} loading={sectionsLoading} error={sectionWarning('активность')} />}
        {view === 'gifts' && (
          <GiftsView key={inspectedProfile?.watch.name ?? settings.syncHandle} mode={giftMode} onMode={setGiftMode} activeId={activeGiftId} onSelect={setActiveGiftId} onRefresh={refreshNow} refreshing={refreshing} selectedAccount={inspectedProfile?.watch.name ?? settings.syncHandle} liveGifts={inspectedProfile ? inspectedGiftRows : syncedGiftRows} catalogGifts={catalogGifts} synced={Boolean(snapshot)} live={isDesktopRuntime} loading={sectionsLoading || profileInspectLoading} error={sectionWarning('каталог подарков')} onAccount={(username) => void openSearchedProfile({ id: `gift-account-${username}`, name: username, note: 'коллекция аккаунта UnixGram', activity: 'подарки аккаунта', gifts: 'подарки загружаются', tone: 'amber' }, 'gifts')} onOpenProfile={(username) => void openSearchedProfile({ id: `gift-${username}`, name: username, note: 'владелец подарка UnixGram', activity: 'коллекция подарков', gifts: 'подарки загружаются', tone: 'amber' })} />
        )}
        {view === 'profile' && <ProfileView profile={activeProfile} summary={profileViewSummary} posts={profilePosts} onOpenGifts={() => chooseView('gifts')} onOpenSettings={() => chooseView('settings')} onShare={sharePost} onProfile={(post) => void openSearchedProfile({ id: `profile-${post.username}`, name: post.username, displayName: post.displayName, note: 'автор публикации UnixGram', activity: 'публикация в профиле', gifts: 'подарки загружаются', tone: post.tone, avatarUrl: post.avatarUrl, verificationBadge: post.verificationBadge, premium: post.premium, emojiStatus: post.emojiStatus }, 'profile', [post])} loading={profileInspectLoading || (refreshing && !inspectedProfile)} error={profileInspectError || syncError} />}
        {view === 'premium' && <PremiumView active={Boolean(liveProfileSummary?.watch.premium)} />}
        {view === 'settings' && (
          <SettingsView
            theme={theme}
            onTheme={setTheme}
            settings={settings}
            section={settingsSection}
            onSection={setSettingsSection}
            onToggle={toggleSetting}
            onSelect={updateSetting}
            bootInfo={bootInfo}
            discordStatus={'__TAURI_INTERNALS__' in window ? discordStatus : settings.discordPresence ? 'доступно в Windows-сборке' : 'выключено'}
            onToast={setToast}
          />
        )}
      </main>

      {showContextPane && (
        <PanelResizeHandle
          className="panel-resizer--context"
          label="Изменить ширину правой панели"
          value={panelLayout.context}
          min={260}
          max={420}
          direction={-1}
          onChange={(context) => setPanelLayout((current) => ({ ...current, context }))}
        />
      )}

      {showContextPane && (
        <aside className="context-pane">
          {view === 'history' && historyMode === 'profiles' && (
            <ProfileWatchContext profile={activeProfile} copied={copied} onCopy={copyCurrent} />
          )}
          {view === 'history' && historyMode !== 'profiles' && (
            <ProfileContext key={activeEvent.id} event={activeEvent} copied={copied} onCopy={copyCurrent} />
          )}
          {view === 'gifts' && <MarketContext key={(activeSyncedGift ?? activeGift).id} giftItem={activeSyncedGift ?? activeGift} copied={copied} onCopy={copyCurrent} />}
          {(view === 'feed' || view === 'search') && <DiscoverContext profiles={mergedProfiles} posts={socialPosts} giftRows={isDesktopRuntime ? catalogGifts : gifts} live={isDesktopRuntime} onOpenProfile={(profile) => void openSearchedProfile(profile)} />}
          {(view === 'messages') && <MessageContext conversation={visibleConversations.find((item) => item.id === activeConversationId) ?? visibleConversations[0] ?? null} />}
          {view === 'people' && <ProfileWatchContext profile={activeProfile} copied={copied} onCopy={copyCurrent} />}
          {view === 'studio' && <SettingsContext bootInfo={bootInfo} settings={settings} section="data" onSection={setSettingsSection} onToggle={toggleSetting} onRefresh={refreshNow} synced={Boolean(snapshot)} />}
        </aside>
      )}
      {toastNode}
      <MediaLightbox state={mediaViewer} onClose={closeMedia} onStep={stepMedia} />
    </div>
    )}
    </MediaViewerContext.Provider>
    </ExternalLinksContext.Provider>
  )
}

function HistoryView({
  events: rows,
  historyMode,
  onHistoryMode,
  activeId,
  onSelect,
  activeProfileId,
  onSelectProfile,
  lastUpdated,
  onRefresh,
  refreshing,
  synced,
  settings,
  profileRows,
  loading,
  error,
}: {
  events: EventRow[]
  historyMode: HistoryMode
  onHistoryMode: (mode: HistoryMode) => void
  activeId: string
  onSelect: (id: string) => void
  activeProfileId: string
  onSelectProfile: (id: string) => void
  lastUpdated: string
  onRefresh: () => void
  refreshing: boolean
  synced: boolean
  settings: SettingsState
  profileRows: ProfileWatchRow[]
  loading: boolean
  error: string
}) {
  return (
    <>
      <header className="workspace-head">
        <div>
          <span className="eyebrow">unixgram</span>
          <h1>Уведомления</h1>
        </div>
        <div className="head-actions">
          <span className="sync-state">
            <i />
            обновлено {lastUpdated} {settings.timeZoneMode === 'msk' ? 'мск' : 'локально'}
          </span>
          <button className="icon-button" type="button" aria-label="Обновить" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw className={refreshing ? 'is-spinning' : ''} size={18} />
          </button>
        </div>
      </header>

      <nav className="workspace-tabs" aria-label="История">
        <button aria-current={historyMode === 'activity' ? 'page' : undefined} className={historyMode === 'activity' ? 'is-active' : ''} type="button" onClick={() => onHistoryMode('activity')}>
          Активность
        </button>
        <button aria-current={historyMode === 'profiles' ? 'page' : undefined} className={historyMode === 'profiles' ? 'is-active' : ''} type="button" onClick={() => onHistoryMode('profiles')}>
          Профили
        </button>
        <button aria-current={historyMode === 'status' ? 'page' : undefined} className={historyMode === 'status' ? 'is-active' : ''} type="button" onClick={() => onHistoryMode('status')}>
          Статусы
        </button>
      </nav>

      <section className="status-banner">
        <div className="status-banner__icon">
          {synced ? <Check size={18} /> : <RefreshCw size={18} />}
        </div>
        <div>
          <strong>{synced ? 'UnixGram ответил, данные получены' : 'живые данные ещё не проверены'}</strong>
          <p>{synced ? `профиль, подарки и лента синхронизированы · следующая проверка через ${settings.refreshRate}` : 'подключите сессию и запустите проверку; рынок подтянется после первого живого ответа'}</p>
        </div>
        <button type="button" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? 'проверяем…' : 'проверить'}
        </button>
      </section>

      {historyMode === 'activity' && (
        <section className="feed">
          <div className="section-title">
            <div>
              <h2>Последние события</h2>
              <p>покупки, ставки, передачи и изменения профилей</p>
            </div>
            <span>{settings.timelineRange === '24h' ? '24 часа' : settings.timelineRange === '7d' ? '7 дней' : '30 дней'}</span>
          </div>
          <div className={`event-list ${settings.compact ? 'is-compact' : ''}`}>
            {loading && rows.length === 0 && <div className="empty-state">загружаем уведомления…</div>}
            {error && <div className="feed-state is-error"><strong>уведомления недоступны</strong><p>{error}</p></div>}
            {rows.map((event) => (
              <button
                key={event.id}
                className={`event-row ${event.id === activeId ? 'is-active' : ''}`}
                type="button"
                onClick={() => onSelect(event.id)}
              >
                <span className={`asset-mark tone-${event.tone}`}>{event.icon}</span>
                <span className="event-copy">
                  <strong>{event.title}</strong>
                  <small>{formatEventMeta(event)}</small>
                </span>
                <span className="event-value">
                  <strong>{event.value}</strong>
                  <time>
                    {event.time} {settings.timeZoneMode === 'msk' ? 'мск' : ''}
                  </time>
                </span>
              </button>
            ))}
          </div>
          {!loading && !error && rows.length === 0 && <div className="empty-state">новых уведомлений пока нет</div>}
          <button className="ghost-action" type="button" onClick={onRefresh}>
            показать свежие данные
          </button>
        </section>
      )}

      {historyMode === 'profiles' && (
        <section className="feed">
          <div className="section-title">
            <div>
              <h2>Отслеживаемые профили</h2>
              <p>активность, подарки и важные изменения</p>
            </div>
            <span>{profileRows.length} аккаунтов</span>
          </div>
          <div className="profile-watch-grid">
            {profileRows.map((profile) => (
              <button
                key={profile.id}
                className={`profile-watch-card ${profile.id === activeProfileId ? 'is-active' : ''}`}
                type="button"
                onClick={() => onSelectProfile(profile.id)}
              >
                {profile.avatarUrl ? <img className="profile-watch-badge" src={profile.avatarUrl} alt="" referrerPolicy="no-referrer" /> : <span className={`profile-watch-badge tone-${profile.tone}`}>{profile.name.slice(0, 1).toUpperCase()}</span>}
                <span className="profile-watch-copy">
                  <strong>{profile.displayName ?? profile.name}{profile.verificationBadge && <span className="verified-mark" aria-label="Подтверждённое сообщество">✓</span>}</strong>
                  <small>{profile.note}</small>
                  <span>{profile.activity}</span>
                </span>
                <b>{profile.gifts}</b>
              </button>
            ))}
          </div>
          {!loading && profileRows.length === 0 && <div className="empty-state">у аккаунта пока нет сообществ</div>}
        </section>
      )}

      {historyMode === 'status' && (
        <section className="feed">
          <div className="section-title">
            <div>
              <h2>Статусы серверов</h2>
              <p>понятная сводка по тому, что влияет на парсинг и обновления</p>
            </div>
            <span>{synced ? 'проверено' : 'не проверено'}</span>
          </div>
          <div className="status-grid">
            <article className="status-card">
              <div>
                <strong>UnixGram web</strong>
                <small>профили, посты, подарки</small>
              </div>
              <b className={synced ? 'state-ok' : 'state-watch'}>{synced ? 'ответил' : 'не проверено'}</b>
            </article>
            <article className="status-card">
              <div>
                <strong>UnixPlace</strong>
                <small>рынок и аукционы</small>
              </div>
              <b className={synced ? 'state-ok' : 'state-watch'}>{synced ? 'ожидаем лоты' : 'не проверено'}</b>
            </article>
            <article className="status-card">
              <div>
                <strong>Клиент</strong>
                <small>локальная оболочка и bridge</small>
              </div>
              <b className="state-ok">интерфейс активен</b>
            </article>
          </div>
        </section>
      )}
    </>
  )
}

function GiftsView({
  mode,
  onMode,
  activeId,
  onSelect,
  onRefresh,
  refreshing,
  selectedAccount,
  liveGifts,
  catalogGifts,
  synced,
  live,
  loading,
  error,
  onOpenProfile,
  onAccount,
}: {
  mode: GiftMode
  onMode: (mode: GiftMode) => void
  activeId: string
  onSelect: (id: string) => void
  onRefresh: () => void
  refreshing: boolean
  selectedAccount: string
  liveGifts: GiftRow[]
  catalogGifts: GiftRow[]
  synced: boolean
  live: boolean
  loading: boolean
  error: string
  onOpenProfile: (username: string) => void
  onAccount: (username: string) => void
}) {
  const openMedia = useContext(MediaViewerContext)
  const [account, setAccount] = useState(selectedAccount)
  const [editingAccount, setEditingAccount] = useState(false)
  const [giftQuery, setGiftQuery] = useState('')
  const [saleOnly, setSaleOnly] = useState(false)
  const [giftSort, setGiftSort] = useState<'default' | 'price-desc' | 'price-asc' | 'history-desc' | 'name'>('default')
  const modes: { id: GiftMode; label: string }[] = [
    { id: 'account', label: 'За аккаунтом' },
    { id: 'market', label: 'По рынку' },
    { id: 'transfers', label: 'Передачи' },
    { id: 'top', label: 'Топ покупок' },
  ]
  const normalizedAccount = normalizeHandle(account)
  const rawAccountSource = live ? liveGifts : gifts
  const accountSource = !normalizedAccount
    ? []
    : rawAccountSource.filter((giftItem) => normalizeHandle(giftItem.owner) === normalizedAccount)
  const previewMarket = live ? catalogGifts : gifts
  const modeGifts = mode === 'account'
    ? accountSource
    : mode === 'market'
      ? previewMarket
      : mode === 'transfers'
        ? [...accountSource].sort((left, right) => (right.history?.length ?? 0) - (left.history?.length ?? 0))
        : [...accountSource].sort((left, right) => (right.lastSaleStars ?? right.valueStars ?? 0) - (left.lastSaleStars ?? left.valueStars ?? 0)).slice(0, 20)
  const giftNeedle = giftQuery.trim().toLowerCase()
  const visibleGifts = [...modeGifts]
    .filter((giftItem) => !giftNeedle || `${giftItem.name} ${giftItem.owner} ${giftItem.collection ?? ''} ${giftItem.model ?? ''} ${giftItem.pattern ?? ''}`.toLowerCase().includes(giftNeedle))
    .filter((giftItem) => !saleOnly || Boolean(giftItem.isOnSale))
    .sort((left, right) => {
      const leftPrice = left.valueStars ?? left.lastSaleStars ?? left.floorPriceStars ?? 0
      const rightPrice = right.valueStars ?? right.lastSaleStars ?? right.floorPriceStars ?? 0
      if (giftSort === 'price-desc') return rightPrice - leftPrice
      if (giftSort === 'price-asc') return leftPrice - rightPrice
      if (giftSort === 'history-desc') return (right.history?.length ?? 0) - (left.history?.length ?? 0)
      if (giftSort === 'name') return left.name.localeCompare(right.name, 'ru')
      return 0
    })
  const numericTotal = accountSource.reduce((total, giftItem) => total + (giftItem.valueStars ?? 0), 0)
  const selectedGift = visibleGifts.find((giftItem) => giftItem.id === activeId) ?? visibleGifts[0] ?? null
  const [giftDetails, setGiftDetails] = useState<GiftDetails | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  useEffect(() => {
    if (!selectedGift) {
      // The selected card belongs to this external data source; reset its cached detail when it disappears.
      // oxlint-disable-next-line react/set-state-in-effect
      setGiftDetails(null)
      return
    }
    if (!live || mode === 'market') {
      setGiftDetails({ ...selectedGift })
      return
    }
    let cancelled = false
    setDetailLoading(true)
    setDetailError('')
    void import('@tauri-apps/api/core').then(({ invoke }) => invoke<unknown>('unixgram_gift_details', { giftId: selectedGift.id })).then((payload) => {
      if (!cancelled) setGiftDetails(buildGiftDetails(payload, selectedGift))
    }).catch((reason) => {
      if (!cancelled) {
        setGiftDetails({ ...selectedGift })
        setDetailError(reason instanceof Error ? reason.message : String(reason))
      }
    }).finally(() => { if (!cancelled) setDetailLoading(false) })
    return () => { cancelled = true }
  }, [live, mode, selectedGift])

  return (
    <>
      <header className="workspace-head">
        <div>
          <span className="eyebrow">коллекции и рынок</span>
          <h1>Подарки</h1>
        </div>
        <div className="head-actions">
          <span className="sync-state">
            <i />
            {synced ? 'синхронизировано' : 'предпросмотр данных'}
          </span>
          <button className="icon-button" type="button" aria-label="Обновить подарки" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw className={refreshing ? 'is-spinning' : ''} size={18} />
          </button>
        </div>
      </header>

      <div className="workspace-tabs gift-tabs" role="tablist" aria-label="Режим подарков">
        {modes.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={mode === item.id}
            tabIndex={mode === item.id ? 0 : -1}
            className={mode === item.id ? 'is-active' : ''}
            type="button"
            onKeyDown={moveTabByArrow}
            onClick={() => onMode(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <section className="gift-toolbar">
        <div>
          <span className="eyebrow">выбранный аккаунт</span>
          <strong>{editingAccount ? <label className="account-editor"><span>@</span><input name="gift-account" aria-label="Аккаунт UnixGram" autoFocus value={account} onChange={(event) => setAccount(event.target.value.replace(/^@/, '').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 32))} onKeyDown={(event) => { if (event.key === 'Enter') { setEditingAccount(false); if (normalizedAccount) onAccount(normalizedAccount) } }} /></label> : normalizedAccount ? <UnixLink username={normalizedAccount} /> : 'аккаунт не выбран'}</strong>
        </div>
        <button className="pending-pill" type="button" onClick={() => setEditingAccount((value) => { const next = !value; if (!next && normalizedAccount) onAccount(normalizedAccount); return next })}>
          {editingAccount ? 'готово' : 'сменить аккаунт'}
        </button>
      </section>

      <section className="gift-filterbar" aria-label="Фильтры подарков">
        <label><span className="visually-hidden">Найти подарок</span><Search size={17} /><input name="gift-search" value={giftQuery} onChange={(event) => setGiftQuery(event.target.value)} placeholder="название, коллекция или владелец" />{giftQuery && <button type="button" aria-label="Очистить фильтр подарков" onClick={() => setGiftQuery('')}><X size={15} /></button>}</label>
        <button className={saleOnly ? 'is-active' : ''} type="button" aria-pressed={saleOnly} onClick={() => setSaleOnly((current) => !current)}><ShoppingBag size={16} /> в продаже</button>
        <label className="gift-sort"><span>сортировка</span><select name="gift-sort" aria-label="Сортировка подарков" value={giftSort} onChange={(event) => setGiftSort(event.target.value as typeof giftSort)}><option value="default">по умолчанию</option><option value="price-desc">сначала дорогие</option><option value="price-asc">сначала дешёвые</option><option value="history-desc">по активности</option><option value="name">по названию</option></select></label>
      </section>

      <section className="gift-metrics">
        <article>
          <span>подарков</span>
          <strong>{loading ? '…' : error ? '—' : accountSource.length}</strong>
          <small>в подключённом аккаунте</small>
        </article>
        <article>
          <span>оценка коллекции</span>
          <strong>{loading ? '…' : numericTotal > 0 ? formatStars(numericTotal) : '—'}</strong>
          <small>по доступным ценам</small>
        </article>
        <article>
          <span>коллекций на рынке</span>
          <strong>{loading ? '…' : error ? '—' : previewMarket.length}</strong>
          <small>данные UnixGram</small>
        </article>
      </section>

      {selectedGift && <section className="gift-inspector" aria-busy={detailLoading}>
        <button className={`gift-inspector__art tone-${selectedGift.tone}`} type="button" disabled={!(giftDetails?.imageUrl || selectedGift.imageUrl)} onClick={() => { const url = giftDetails?.imageUrl || selectedGift.imageUrl; if (url) openMedia([url], 0, giftDetails?.name || selectedGift.name) }} aria-label={(giftDetails?.imageUrl || selectedGift.imageUrl) ? `Открыть изображение ${giftDetails?.name || selectedGift.name}` : 'Изображение подарка отсутствует'}>{(giftDetails?.imageUrl || selectedGift.imageUrl) ? <img src={giftDetails?.imageUrl || selectedGift.imageUrl} alt="" referrerPolicy="no-referrer" /> : <Gift size={44} />}</button>
        <div className="gift-inspector__copy"><span className="eyebrow">{mode === 'market' ? 'коллекция на рынке' : 'выбранный подарок'}</span><h2>{giftDetails?.name || selectedGift.name}</h2><p>{giftDetails?.collection || selectedGift.collection || 'коллекционный подарок UnixGram'}{giftDetails?.serial ? ` · #${giftDetails.serial.toLocaleString('ru-RU')}` : ''}</p><div className="gift-traits">{giftDetails?.model && <span><small>модель</small><b>{giftDetails.model}</b></span>}{giftDetails?.background && <span><small>фон</small><b>{giftDetails.background}</b></span>}{giftDetails?.pattern && <span><small>символ</small><b>{giftDetails.pattern}</b></span>}{giftDetails?.rarity && <span><small>редкость</small><b>{giftDetails.rarity}</b></span>}</div>{giftDetails?.history && giftDetails.history.length > 0 && <div className="gift-history">{giftDetails.history.slice(0, 4).map((event) => <span key={event.id}><b>{event.type.replaceAll('_', ' ').toLowerCase()}</b><small>{event.from && <><UnixLink username={event.from}>@{event.from}</UnixLink> <span>→</span> </>}{event.to && <UnixLink username={event.to}>@{event.to}</UnixLink>}{event.priceStars ? ` · ${formatStars(event.priceStars)}` : ''} · {event.time}</small></span>)}</div>}{detailError && <small className="gift-detail-error">детали временно неполные: {detailError}</small>}</div>
        <div className="gift-inspector__side"><span>оценка</span><strong>{giftDetails?.valueStars ? formatStars(giftDetails.valueStars) : selectedGift.price}</strong>{giftDetails?.floorPriceStars && <small>floor {formatStars(giftDetails.floorPriceStars)}</small>}{giftDetails?.historyCount !== undefined && <small>{giftDetails.historyCount} событий в истории</small>}{giftDetails?.owner && giftDetails.owner !== 'unknown' && <button type="button" onClick={() => onOpenProfile(giftDetails.owner)}>владелец @{giftDetails.owner}</button>}<SafeExternalLink className="primary-action" href={giftDetails?.slug ? `https://unixgram.com/gifts/${giftDetails.slug}` : `https://unixgram.com/gift/${selectedGift.id}`}>{giftDetails?.isOnSale || selectedGift.isOnSale ? 'Открыть продажу' : 'Открыть в UnixGram'} <ExternalLink size={15} /></SafeExternalLink></div>
      </section>}

      <section className="gift-content">
        <div className="section-title">
          <div>
            <h2>{modes.find((item) => item.id === mode)?.label}</h2>
            <p>{giftModeDescription(mode)}</p>
          </div>
          <span>{visibleGifts.length} объектов</span>
        </div>
        <div className="gift-grid">
          {loading && visibleGifts.length === 0 && <div className="empty-state">загружаем подарки…</div>}
          {error && <div className="feed-state is-error"><strong>подарки недоступны</strong><p>{error}</p></div>}
          {visibleGifts.map((giftItem) => (
            <button
              key={giftItem.id}
              className={`gift-card ${activeId === giftItem.id ? 'is-active' : ''}`}
              type="button"
              onClick={() => onSelect(giftItem.id)}
            >
              <span className={`gift-art tone-${giftItem.tone}`}>
                {giftItem.imageUrl ? <img src={giftItem.imageUrl} alt="" referrerPolicy="no-referrer" loading="lazy" /> : <><Gift size={28} /><b>{giftItem.mark}</b></>}
              </span>
              <span className="gift-card__copy">
                <strong>{giftItem.name}</strong>
                <small>{mode === 'market' ? giftItem.listingCount !== undefined ? `${giftItem.listingCount} лотов` : 'предпросмотр рынка' : mode === 'transfers' ? `${giftItem.history?.length ?? 0} событий · @${giftItem.owner}` : mode === 'top' ? `последняя цена · @${giftItem.owner}` : `владелец ${giftItem.owner.startsWith('@') ? giftItem.owner : `@${giftItem.owner}`}`}</small>
                <span>
                  <b>{giftItem.price}</b>
                  <em className={giftItem.delta.startsWith('-') ? 'is-down' : ''}>{giftItem.delta}</em>
                </span>
              </span>
            </button>
          ))}
        </div>
        {!loading && !error && visibleGifts.length === 0 && <div className="empty-state">{giftNeedle || saleOnly ? 'по этим фильтрам подарков нет' : mode === 'account' ? normalizedAccount ? 'UnixGram не вернул подарки этого аккаунта' : 'сначала выберите аккаунт для подарков' : mode === 'transfers' ? 'у подарков аккаунта пока нет доступной истории передач' : mode === 'top' ? 'у аккаунта пока нет покупок с доступной ценой' : 'на рынке пока нет доступных коллекций'}</div>}
      </section>
    </>
  )
}

function PremiumView({ active }: { active: boolean }) {
  const features = [
    { Icon: Star, title: 'Premium-знак', text: 'статус рядом с именем в ленте, профиле и сообщениях' },
    { Icon: Palette, title: 'Оформление профиля', text: 'цвет имени и дополнительные визуальные возможности UnixGram' },
    { Icon: Sparkles, title: 'Emoji-статус', text: 'статус отображается рядом с именем без выдуманных галочек' },
    { Icon: MessageCircle, title: 'Возможности общения', text: 'доступность функций определяется вашим аккаунтом UnixGram' },
  ]
  return <section className="premium-view">
    <header className="premium-hero">
      <span className="premium-hero__icon"><Star size={34} fill="currentColor" /></span>
      <small>UNIX PREMIUM</small>
      <h1>{active ? 'Premium подключён' : 'Unix Premium'}</h1>
      <p>{active ? 'клиент получил Premium-статус из профиля UnixGram.' : 'расширенные возможности официального аккаунта UnixGram в desktop-клиенте.'}</p>
      <SafeExternalLink className="premium-action" href="https://unixgram.com/premium">{active ? 'Открыть Premium в UnixGram' : 'Узнать о Premium'} <ExternalLink size={15} /></SafeExternalLink>
    </header>
    <div className="premium-features"><div className="section-title"><div><h2>В клиенте</h2><p>никаких искусственных отметок: показываем только данные аккаунта.</p></div></div><div className="premium-feature-grid">{features.map(({ Icon, title, text }) => <article key={title}><span><Icon size={18} /></span><div><strong>{title}</strong><p>{text}</p></div><Check size={15} /></article>)}</div></div>
  </section>
}

function SettingsView({
  theme,
  onTheme,
  settings,
  section,
  onSection,
  onToggle,
  onSelect,
  bootInfo,
  discordStatus,
  onToast,
}: {
  theme: ThemeId
  onTheme: (theme: ThemeId) => void
  settings: SettingsState
  section: SettingsSection
  onSection: (section: SettingsSection) => void
  onToggle: (key: BooleanSettingKey) => void
  onSelect: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void
  bootInfo: BootInfo | null
  discordStatus: string
  onToast: (message: string) => void
}) {
  const selectSection = (next: SettingsSection) => {
    onSection(next)
    requestAnimationFrame(() => {
      document.getElementById('workspace')?.scrollTo({ top: 0, behavior: 'auto' })
    })
  }

  return (
    <>
      <header className="workspace-head">
        <div>
          <span className="eyebrow">UnixGram Desktop</span>
          <h1>Настройки</h1>
        </div>
        <span className="sync-state">
          <i />
          сохраняются автоматически
        </span>
      </header>

      <section className="settings-layout">
        <aside className="settings-nav" aria-label="Разделы настроек">
          {settingsSections.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`settings-nav__item ${section === id ? 'is-active' : ''}`}
              type="button"
              onClick={() => selectSection(id)}
              aria-current={section === id ? 'page' : undefined}
            >
              <Icon size={17} />
              <span>{label}</span>
              <ChevronRightSmall />
            </button>
          ))}
        </aside>

        <div className="settings-panel">
          {section === 'session' && (
            <SessionSettings syncHandle={settings.syncHandle} onSyncHandle={(value) => onSelect('syncHandle', value)} onToast={onToast} />
          )}
          {section === 'appearance' && (
            <SettingsBlock title="Внешний вид" note="тема, размер текста и плотность интерфейса">
              <div className="theme-grid">
                {themeCards.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    className={`theme-card theme-preview-${card.id} ${theme === card.id ? 'is-active' : ''}`}
                    onClick={() => onTheme(card.id)}
                  >
                    <span className="theme-preview">
                      <i />
                      <i />
                      <i />
                      <b />
                    </span>
                    <span>
                      <strong>{card.label}</strong>
                      <small>{card.note}</small>
                    </span>
                    {theme === card.id && <Check size={18} />}
                  </button>
                ))}
              </div>
              <ToggleRow title="Крупный текст" note="увеличить шрифты в ленте, карточках и правой панели" value={settings.largeText} onClick={() => onToggle('largeText')} />
              <SegmentRow
                title="Масштаб интерфейса"
                note="отдельно увеличивает весь клиент, включая кнопки и навигацию"
                value={settings.fontScale}
                options={[
                  { value: 'normal', label: '100%' },
                  { value: 'large', label: '108%' },
                  { value: 'xlarge', label: '116%' },
                ]}
                onChange={(value) => onSelect('fontScale', value)}
              />
              <ToggleRow title="Компактный список" note="помещать больше событий на один экран" value={settings.compact} onClick={() => onToggle('compact')} />
              <SegmentRow
                title="Стиль рамки клиента"
                note="визуальное оформление верхних панелей внутри клиента"
                value={settings.titlebarStyle}
                options={[
                  { value: 'clean', label: 'Чистый' },
                  { value: 'system', label: 'Системный' },
                ]}
                onChange={(value) => onSelect('titlebarStyle', value)}
              />
            </SettingsBlock>
          )}

          {section === 'interface' && (
            <SettingsBlock title="Интерфейс" note="поведение основных панелей и стартового раздела">
              <SegmentRow
                title="Стартовый экран"
                note="какой раздел открывать первым при запуске клиента"
                value={settings.launchTo}
                options={[
                  { value: 'feed', label: 'Лента' },
                  { value: 'history', label: 'История' },
                  { value: 'gifts', label: 'Подарки' },
                  { value: 'profile', label: 'Профиль' },
                ]}
                onChange={(value) => onSelect('launchTo', value)}
              />
              <ToggleRow title="Правая панель" note="держать профиль, рынок или статус справа открытыми всегда" value={settings.keepRightPanel} onClick={() => onToggle('keepRightPanel')} />
              <ToggleRow title="Запоминать поиск" note="не очищать запрос при переходе между разделами" value={settings.rememberSearch} onClick={() => onToggle('rememberSearch')} />
              <SegmentRow
                title="Диапазон истории"
                note="какой срез считать основным при открытии ленты"
                value={settings.timelineRange}
                options={[
                  { value: '24h', label: '24 часа' },
                  { value: '7d', label: '7 дней' },
                  { value: '30d', label: '30 дней' },
                ]}
                onChange={(value) => onSelect('timelineRange', value)}
              />
            </SettingsBlock>
          )}

          {section === 'notifications' && (
            <SettingsBlock title="Уведомления" note="какие сигналы клиент должен поднимать поверх основной ленты">
              <ToggleRow title="Уведомления вообще" note="единый мастер-переключатель для локальных уведомлений" value={settings.notifications} onClick={() => onToggle('notifications')} />
              <ToggleRow title="Десктоп-тосты" note="показывать системные подсказки о крупных событиях" value={settings.desktopToasts} onClick={() => onToggle('desktopToasts')} />
              <ToggleRow title="Крупные покупки" note="сигналить при подтверждённых больших сделках" value={settings.purchaseAlerts} onClick={() => onToggle('purchaseAlerts')} />
              <ToggleRow title="Новые ставки" note="отдельно подсвечивать рост дорогих аукционов" value={settings.bidAlerts} onClick={() => onToggle('bidAlerts')} />
              <ToggleRow title="Передачи подарков" note="следить за движением между аккаунтами без продажи" value={settings.transferAlerts} onClick={() => onToggle('transferAlerts')} />
              <ToggleRow title="Звуки" note="звуковые сигналы поверх визуальных уведомлений" value={settings.soundEffects} onClick={() => onToggle('soundEffects')} />
            </SettingsBlock>
          )}

          {section === 'data' && (
            <SettingsBlock title="Обновление данных" note="частота синхронизации и поведение при слабом соединении">
              <ToggleRow title="Автообновление" note="обновлять ленту без перезапуска клиента" value={settings.autoRefresh} onClick={() => onToggle('autoRefresh')} />
              <SegmentRow
                title="Интервал проверки"
                note="как часто дёргать локальные обновления интерфейса"
                value={settings.refreshRate}
                options={[
                  { value: '30s', label: '30 сек' },
                  { value: '1m', label: '1 мин' },
                  { value: '5m', label: '5 мин' },
                ]}
                onChange={(value) => onSelect('refreshRate', value)}
              />
              <SegmentRow
                title="Часовой режим"
                note="показывать время строго по мск или локально"
                value={settings.timeZoneMode}
                options={[
                  { value: 'msk', label: 'МСК' },
                  { value: 'local', label: 'Локально' },
                ]}
                onChange={(value) => onSelect('timeZoneMode', value)}
              />
              <ToggleRow title="Проверка обновлений при старте" note="сразу сверять состояние клиента и доступность сервисов" value={settings.checkUpdatesOnLaunch} onClick={() => onToggle('checkUpdatesOnLaunch')} />
              <ToggleRow title="Экономия трафика" note="не загружать тяжёлые превью до открытия карточки" value={settings.dataSaver} onClick={() => onToggle('dataSaver')} />
              <SegmentRow title="Таймаут API" note="сколько ждать ответ UnixGram до понятной ошибки" value={settings.requestTimeout} options={[{ value: '8', label: '8 сек' }, { value: '12', label: '12 сек' }, { value: '20', label: '20 сек' }]} onChange={(value) => onSelect('requestTimeout', value)} />
              <SegmentRow title="Повторные попытки" note="короткие повторы при временном сбое сети" value={settings.retryCount} options={[{ value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' }]} onChange={(value) => onSelect('retryCount', value)} />
            </SettingsBlock>
          )}

          {section === 'window' && (
            <SettingsBlock title="Окно и ссылки" note="как клиент открывает профили и куда уводит внешние переходы">
              <InfoRow title="Системный трей" value="активен · двойной клик открывает окно" />
              <InfoRow title="Кнопка закрытия" value="сворачивает клиент в трей" />
              <InfoRow title="Профили" value="только ссылки UnixGram" />
              <ToggleRow title="Ссылки профилей" note="разрешить открывать UnixGram-профили из карточек" value={settings.openLinksExternally} onClick={() => onToggle('openLinksExternally')} />
              <ToggleRow title="Меньше движения" note="срезать анимацию и резкие смены состояния" value={settings.reducedMotion} onClick={() => onToggle('reducedMotion')} />
            </SettingsBlock>
          )}

          {section === 'advanced' && (
            <SettingsBlock title="Возможности" note="дополнительные функции приложения">
              <ToggleRow title="Единый поиск" note="искать профили, подарки и события в одном месте" value={settings.unifiedSearchBeta} onClick={() => onToggle('unifiedSearchBeta')} />
              <InfoRow title="Защита ссылок" value="разрешён только unixgram.com" />
              <InfoRow title="Хранилище сессии" value="Windows Credential Manager" />
            </SettingsBlock>
          )}

          {section === 'integrations' && (
            <SettingsBlock title="Discord" note="статус UnixGram Desktop в вашем профиле Discord">
              <div className="discord-app-row"><span className="discord-app-mark">D</span><span><strong>UnixGram Desktop</strong><small>приложение {DEFAULT_DISCORD_CLIENT_ID}</small></span><b>подключено</b></div>
              <ToggleRow title="Показывать активность" note="показывать в Discord, что открыт UnixGram Desktop" value={settings.discordPresence} onClick={() => onToggle('discordPresence')} />
              <ToggleRow title="Текущий раздел" note="показывать ленту, подарки или сообщения без личных данных" value={settings.discordShowSection} onClick={() => onToggle('discordShowSection')} />
              <InfoRow title="Статус Discord" value={discordStatus} live />
              <div className="settings-note"><strong>Приватность</strong><p>текст сообщений, аккаунты, подарки и цены в Discord не передаются.</p></div>
            </SettingsBlock>
          )}

          {section === 'about' && (
            <SettingsBlock title="О приложении" note="версия и техническая информация">
              <InfoRow title="Сборка" value={bootInfoLabel(bootInfo)} />
              <InfoRow title="Темы" value={String(themeCards.length)} />
              <InfoRow title="Ссылки" value="только UnixGram" />
              <InfoRow title="Версия" value="0.8.0" />
            </SettingsBlock>
          )}
        </div>
      </section>
    </>
  )
}

function SettingsBlock({
  title,
  note,
  children,
}: {
  title: string
  note: string
  children: React.ReactNode
}) {
  return (
    <section className="settings-block-card">
      <div className="settings-block-card__head">
        <h2>{title}</h2>
        <p>{note}</p>
      </div>
      <div className="settings-group">{children}</div>
    </section>
  )
}

function StartupSplash({ bootInfo, desktopRuntime }: { bootInfo: BootInfo | null; desktopRuntime: boolean }) {
  return (
    <div className="startup-shell">
      <section className="startup-splash" aria-labelledby="startup-title" aria-busy="true">
        <div className="startup-splash__mark">
          <img src="/unixgram-mark.svg" alt="" />
        </div>
        <span>{desktopRuntime ? 'приложение Windows' : 'гостевой режим'}</span>
        <h1 id="startup-title">UnixGram Desktop</h1>
        <p>проверяем сессию…</p>
        <div className="startup-splash__meta" role="status" aria-live="polite">
          <b>{bootInfo?.channel ?? 'загрузка'}</b>
          <small>{bootInfo?.status ?? 'проверяем окружение'}</small>
        </div>
      </section>
    </div>
  )
}

function AuthGate({
  bootInfo,
  syncHandle,
  onSyncHandle,
  onToast,
  previewMode,
  onPreviewUnlock,
}: {
  bootInfo: BootInfo | null
  syncHandle: string
  onSyncHandle: (value: string) => void
  onToast: (message: string) => void
  previewMode: boolean
  onPreviewUnlock: () => void
}) {
  return (
    <div className="startup-shell startup-shell--gate">
      <section className="auth-gate" aria-labelledby="auth-gate-title">
        <div className="auth-gate__intro">
          <span>unixgram desktop</span>
          <h1 id="auth-gate-title">Вход в UnixGram</h1>
          <p>пароль, браузер или QR-код.</p>
          <div className="auth-gate__chips">
            <b>{bootInfo?.channel ?? 'desktop shell'}</b>
            <small>{previewMode ? 'гостевая оболочка для локальной проверки интерфейса' : bootInfo?.status ?? 'ожидаем вход'}</small>
          </div>
        </div>
        <SessionSettings
          standalone
          syncHandle={syncHandle}
          onSyncHandle={onSyncHandle}
          onToast={onToast}
          previewMode={previewMode}
          onPreviewUnlock={onPreviewUnlock}
        />
      </section>
    </div>
  )
}

function SessionSettings({
  syncHandle,
  onSyncHandle,
  onToast,
  standalone = false,
  previewMode = false,
  onPreviewUnlock,
}: {
  syncHandle: string
  onSyncHandle: (value: string) => void
  onToast: (message: string) => void
  standalone?: boolean
  previewMode?: boolean
  onPreviewUnlock?: () => void
}) {
  const [method, setMethod] = useState<'password' | 'browser' | 'qr'>('qr')
  const [session, setSession] = useState<SessionInfo>({ connected: false, storage: 'Windows Credential Manager', message: 'проверяем сессию…' })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [qrUrl, setQrUrl] = useState('')
  const [qrImage, setQrImage] = useState('')
  const [busy, setBusy] = useState(false)
  const [authError, setAuthError] = useState('')
  const [snapshot, setSnapshot] = useState<SyncSnapshot | null>(null)
  const qrPollFailures = useRef(0)

  const invokeDesktop = async <T,>(command: string, args?: Record<string, unknown>) => {
    if (!('__TAURI_INTERNALS__' in window)) throw new Error('вход доступен в Windows-приложении')
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<T>(command, args)
  }

  const applySession = useCallback((info: SessionInfo) => {
    setSession(info)
    const username = normalizeHandle(info.username || '')
    if (info.connected && username) onSyncHandle(username)
    window.dispatchEvent(new CustomEvent('unixgram-session-changed', { detail: info }))
  }, [onSyncHandle])

  useEffect(() => {
    void invokeDesktop<SessionInfo>('unixgram_session_status')
      .then(applySession)
      .catch((error) => setSession({ connected: false, storage: 'Windows Credential Manager', message: error instanceof Error ? error.message : String(error) }))
  }, [applySession])

  useEffect(() => {
    if (!qrUrl || session.connected || method === 'password') return
    let stopped = false
    const timer = window.setInterval(() => {
      void invokeDesktop<SessionInfo>('unixgram_qr_poll')
        .then((info) => {
          if (stopped) return
          qrPollFailures.current = 0
          applySession(info)
          if (info.connected) {
            setQrUrl('')
            setQrImage('')
            onToast(`UnixGram подключён${info.username ? `: @${info.username}` : ''}`)
          }
        })
        .catch((error) => {
          if (stopped) return
          const message = error instanceof Error ? error.message : String(error)
          qrPollFailures.current += 1
          onToast(message)
          if (/expired|denied|отклон|ист[её]к/i.test(message) || qrPollFailures.current >= 3) {
            setQrUrl('')
            setQrImage('')
            setSession((current) => ({ ...current, message: 'QR-вход остановлен — запросите новый код' }))
          }
        })
    }, 2_000)
    return () => {
      stopped = true
      window.clearInterval(timer)
    }
  }, [applySession, method, onToast, qrUrl, session.connected])

  const startQr = async (openBrowser: boolean) => {
    setBusy(true)
    setAuthError('')
    try {
      const result = await invokeDesktop<QrStart>('unixgram_qr_start')
      qrPollFailures.current = 0
      setQrUrl(result.approvalUrl)
      setQrImage(await QRCode.toDataURL(result.approvalUrl, { width: 220, margin: 1, color: { dark: '#08090d', light: '#ffffff' } }))
      setSession((current) => ({ ...current, connected: false, message: 'ожидаем подтверждение входа' }))
      if (openBrowser) await invokeDesktop<void>('open_unixgram_url', { url: result.approvalUrl })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setAuthError(message)
      onToast(message)
    } finally {
      setBusy(false)
    }
  }

  const loginWithPassword = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setAuthError('')
    try {
      const info = await invokeDesktop<SessionInfo>('unixgram_login_password', { input: { email, password, twoFactorCode: twoFactorCode || null, captchaToken: null } })
      applySession(info)
      setPassword('')
      setTwoFactorCode('')
      onToast('вход выполнен, пароль не сохранён')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const display = message.includes('CAPTCHA') ? 'UnixGram запросил captcha — используйте браузер или QR' : message
      setAuthError(display)
      onToast(display)
    } finally {
      setBusy(false)
    }
  }

  const syncNow = async () => {
    setBusy(true)
    try {
      const handle = normalizeHandle(session.username || syncHandle)
      if (!handle) throw new Error('UnixGram не вернул username аккаунта')
      const fresh = await invokeDesktop<SyncSnapshot>('unixgram_sync', { handle })
      setSnapshot(fresh)
      window.dispatchEvent(new CustomEvent('unixgram-snapshot-updated', { detail: fresh }))
      onToast(fresh.warnings?.length ? fresh.warnings.join(' · ') : 'профиль, подарки и лента обновлены')
    } catch (error) {
      onToast(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  const logout = async () => {
    setBusy(true)
    try {
      await invokeDesktop<void>('unixgram_logout')
      setSession({ connected: false, username: null, storage: 'Windows Credential Manager', message: 'аккаунт отключён' })
      window.dispatchEvent(new CustomEvent('unixgram-session-changed', { detail: { connected: false, username: null, storage: 'Windows Credential Manager', message: 'аккаунт отключён' } satisfies SessionInfo }))
      setSnapshot(null)
      onToast('сессия отозвана и удалена')
    } catch (error) {
      onToast(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  const content = (
    <>
      {!session.connected && <div className="login-shell">
        <aside className="login-visual"><img src="/unixgram-mark.svg" alt="" /><div className="login-brand"><span>UNIXGRAM DESKTOP</span><h3>UnixGram</h3><p>Мессенджер и социальная сеть</p></div></aside>
        <div className="login-content">
          <div className="login-content__head"><h3>Войти в аккаунт</h3><p>выберите удобный способ</p></div>
          {authError && <div className="login-error" role="alert">{authError}</div>}
          <div className="login-methods" role="tablist" aria-label="Способ входа">
            <button id="login-tab-qr" type="button" role="tab" aria-controls="login-panel-qr" aria-selected={method === 'qr'} tabIndex={method === 'qr' ? 0 : -1} className={method === 'qr' ? 'is-active' : ''} onKeyDown={moveTabByArrow} onClick={() => setMethod('qr')}>QR-код</button>
            <button id="login-tab-browser" type="button" role="tab" aria-controls="login-panel-browser" aria-selected={method === 'browser'} tabIndex={method === 'browser' ? 0 : -1} className={method === 'browser' ? 'is-active' : ''} onKeyDown={moveTabByArrow} onClick={() => setMethod('browser')}>Браузер</button>
            <button id="login-tab-password" type="button" role="tab" aria-controls="login-panel-password" aria-selected={method === 'password'} tabIndex={method === 'password' ? 0 : -1} className={method === 'password' ? 'is-active' : ''} onKeyDown={moveTabByArrow} onClick={() => setMethod('password')}>Пароль</button>
          </div>
          {method === 'password' && <div id="login-panel-password" role="tabpanel" aria-labelledby="login-tab-password"><form className="login-form" onSubmit={loginWithPassword}><label><span>Почта или логин</span><input name="username" type="text" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" required /></label><label><span>Пароль</span><input name="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" minLength={8} maxLength={72} required /></label><label><span>Код 2FA <small>если включён</small></span><input name="two-factor-code" inputMode="numeric" autoComplete="one-time-code" value={twoFactorCode} onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" /></label><button className="primary-action" type="submit" disabled={busy}>{busy ? 'Входим…' : 'Войти'}</button><small>данные отправляются напрямую в UnixGram.</small></form></div>}
          {method === 'browser' && <div id="login-panel-browser" role="tabpanel" aria-labelledby="login-tab-browser" className="login-choice"><span className="login-choice__icon"><AppWindowMac size={28} /></span><div><strong>Подтверждение в браузере</strong><p>откроем официальный UnixGram и автоматически подключим сессию после подтверждения.</p></div><button className="primary-action" type="button" disabled={busy} onClick={() => void startQr(true)}>Продолжить в браузере</button></div>}
          {method === 'qr' && <div id="login-panel-qr" role="tabpanel" aria-labelledby="login-tab-qr" className="login-choice qr-choice">{qrImage ? <img src={qrImage} alt="QR-код для входа в UnixGram" /> : <span className="login-choice__icon"><UserRound size={34} /></span>}<div><strong>{qrImage ? 'Отсканируйте QR-код' : 'Вход через телефон'}</strong><p>откройте UnixGram на телефоне и подтвердите вход.</p></div><button className="primary-action" type="button" disabled={busy} onClick={() => void startQr(false)}>{qrImage ? 'Обновить QR' : 'Показать QR'}</button></div>}
          {previewMode && onPreviewUnlock && <div className="login-preview-note"><strong>гостевой режим</strong><p>откройте интерфейс без аккаунта. синхронизация доступна после входа в приложении.</p><button className="secondary-action" type="button" onClick={onPreviewUnlock}>Открыть интерфейс</button></div>}
        </div>
      </div>}
      {session.connected && <div className="connected-account"><div className="connected-avatar">{(session.username || 'U').slice(0,1).toUpperCase()}</div><div><span>Аккаунт подключён</span><h3>@{session.username || syncHandle}</h3><p>лента, профиль и подарки загружаются автоматически</p></div><button type="button" disabled={busy} onClick={() => void syncNow()}><RefreshCw className={busy ? 'is-spinning' : ''} size={17} /> Обновить</button><button className="danger-action" type="button" disabled={busy} onClick={() => void logout()}><Trash2 size={16} /> Выйти</button>{snapshot && <small>последняя синхронизация · {new Date(snapshot.fetchedAtEpoch * 1000).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</small>}</div>}
      <div className={`session-status ${session.connected ? 'is-connected' : ''}`} role="status" aria-live="polite"><span><i /><strong>{session.connected ? 'Сессия активна' : 'Ожидается вход'}</strong><small>{session.message}</small></span><b>{session.storage}</b></div>
    </>
  )

  if (standalone) return <div className="session-settings-standalone">{content}</div>

  return (
    <SettingsBlock title="Аккаунт UnixGram" note="один вход — дальше приложение загружает профиль, ленту и подарки автоматически">
      {content}
    </SettingsBlock>
  )
}

function ToggleRow({
  title,
  note,
  value,
  onClick,
}: {
  title: string
  note: string
  value: boolean
  onClick: () => void
}) {
  return (
    <button className="toggle-row" type="button" role="switch" aria-checked={value} onClick={onClick}>
      <span>
        <strong>{title}</strong>
        <small>{note}</small>
      </span>
      <i className={value ? 'is-on' : ''}>
        <b />
      </i>
    </button>
  )
}

function SegmentRow<T extends string>({
  title,
  note,
  value,
  options,
  onChange,
}: {
  title: string
  note: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="segment-row">
      <span>
        <strong>{title}</strong>
        <small>{note}</small>
      </span>
      <div className="segmented-control" role="radiogroup" aria-label={title}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            tabIndex={value === option.value ? 0 : -1}
            className={value === option.value ? 'is-active' : ''}
            onKeyDown={moveRadioByArrow}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function InfoRow({ title, value, live = false }: { title: string; value: string; live?: boolean }) {
  return (
    <div className="info-row" role={live ? 'status' : undefined} aria-live={live ? 'polite' : undefined}>
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  )
}

function DiscoverContext({ profiles, posts, giftRows, live, onOpenProfile }: { profiles: ProfileWatchRow[]; posts: SocialPost[]; giftRows: GiftRow[]; live: boolean; onOpenProfile: (profile: ProfileWatchRow) => void }) {
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(false)
  const previewTrends = [
    ['Подарки', 'Crystal #018', '1 246 публикаций'],
    ['Сейчас обсуждают', 'UnixGram Desktop', '684 публикации'],
    ['Рынок', 'Крупные покупки', '317 публикаций'],
    ['Профили', 'Новые авторы', '128 публикаций'],
    ['Аукционы', 'Завершаются сегодня', '46 лотов'],
  ]
  const liveTrends = [
    ...giftRows.slice(0, 3).map((giftItem) => ['Подарок', giftItem.name, giftItem.listingCount !== undefined ? `${giftItem.listingCount} лотов` : giftItem.price]),
    ...posts.slice(0, 3).map((post) => ['Публикация', post.displayName, `${post.views.toLocaleString('ru-RU')} просмотров`]),
  ]
  const trends = live ? liveTrends : previewTrends
  const needle = query.trim().toLowerCase()
  const visibleTrends = trends.filter((trend) => !needle || trend.join(' ').toLowerCase().includes(needle)).slice(0, expanded ? trends.length : 3)
  const visibleProfiles = profiles.filter((profile) => !needle || `${profile.displayName ?? ''} ${profile.name} ${profile.note}`.toLowerCase().includes(needle)).slice(0, expanded ? 6 : 3)
  return (
    <div className="discover-panel">
      <label className="discover-search"><Search size={17} /><input name="sidebar-search" aria-label="Поиск в UnixGram" placeholder="Поиск" value={query} onChange={(event) => setQuery(event.target.value)} />{query && <button type="button" aria-label="Очистить поиск" onClick={() => setQuery('')}><X size={15} /></button>}</label>
      <section className="discover-card">
        <h2>Актуальное</h2>
        <div className="trend-list">
          {visibleTrends.map(([category, title, count]) => <button type="button" key={title} onClick={() => setQuery(title)}><small>{category}</small><strong>{title}</strong><span>{count}</span></button>)}
        </div>
        {!query && <button className="discover-more" type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>{expanded ? 'Свернуть' : 'Показать ещё'}</button>}
      </section>
      <section className="discover-card">
        <h2>Кого читать</h2>
        <div className="suggested-list">
          {visibleProfiles.map((profile) => {
            return <div key={profile.id}><button className="suggested-profile" type="button" onClick={() => onOpenProfile(profile)}>{profile.avatarUrl ? <img className="result-mark" src={profile.avatarUrl} alt="" referrerPolicy="no-referrer" /> : <span className={`result-mark tone-${profile.tone}`}>{profile.name.slice(0, 1).toUpperCase()}</span>}<span><strong>{profile.displayName || profile.name}{profile.verificationBadge && <span className="verified-mark" aria-label="Подтверждённый аккаунт">✓</span>}</strong><small>@{normalizeHandle(profile.name)}</small></span></button><button type="button" onClick={() => onOpenProfile(profile)}>Читать</button></div>
          })}
        </div>
        {visibleProfiles.length === 0 && <p className="context-copy">рекомендаций пока нет</p>}
      </section>
      <p className="discover-foot">fork unixgram для windows · независимый клиент сообщества</p>
    </div>
  )
}

function ProfileContext({
  event,
  copied,
  onCopy,
}: {
  event: EventRow
  copied: boolean
  onCopy: () => void
}) {
  return (
    <>
      <header className="context-head">
        <span>Профиль</span>
        <SafeExternalLink className="icon-button" href={`https://unixgram.com/u/${event.actor}`} aria-label="Открыть ссылку на UnixGram">
          <ExternalLink size={17} />
        </SafeExternalLink>
      </header>
      <section className="profile-card">
        {event.avatarUrl ? <img className="profile-avatar" src={event.avatarUrl} alt="" referrerPolicy="no-referrer" /> : <div className={`profile-avatar tone-${event.tone}`}>{event.actor.slice(0, 1).toUpperCase()}</div>}
        <h2>{event.actor}{event.verificationBadge && <span className="verified-mark" aria-label="Подтверждённый аккаунт">✓</span>}</h2>
        <UnixLink username={event.actor} />
        <div className="profile-actions">
          <SafeExternalLink href={`https://unixgram.com/u/${event.actor}`}>
            <Link2 size={19} />
            <span>Открыть</span>
          </SafeExternalLink>
          <button type="button" onClick={onCopy}>
            {copied ? <Check size={19} /> : <Share2 size={19} />}
            <span>{copied ? 'Готово' : 'Поделиться'}</span>
          </button>
        </div>
      </section>

      <section className="context-section profile-fields">
        <div>
          <span>Имя пользователя</span>
          <UnixLink username={event.actor} />
        </div>
        <div>
          <span>Последнее событие</span>
          <strong>{event.kind}</strong>
        </div>
        <div>
          <span>Стоимость</span>
          <strong>{event.value}</strong>
        </div>
      </section>

      <section className="context-section">
        <div className="context-title">
          <h3>История</h3>
          <span>{event.time} мск</span>
        </div>
        <p className="context-copy">{event.title}. источник открывается только в UnixGram.</p>
        <SafeExternalLink className="text-action" href={`https://unixgram.com/u/${event.actor}`}>
          <Link2 size={16} /> открыть страницу UnixGram
        </SafeExternalLink>
      </section>

      <a className="report-button" href="https://t.me/unixgramhistory?direct" target="_blank" rel="noreferrer">
        сообщить об ошибке данных
      </a>
      <p className="disclaimer">
        независимый проект энтузиастов. мы не связаны с создателями UnixGram и не являемся их
        официальным представителем.
      </p>
    </>
  )
}

function ProfileWatchContext({
  profile,
  copied,
  onCopy,
}: {
  profile: ProfileWatchRow
  copied: boolean
  onCopy: () => void
}) {
  return (
    <>
      <header className="context-head">
        <span>Аккаунт</span>
        <button className="icon-button" type="button" aria-label="Поделиться аккаунтом" onClick={onCopy}>
          {copied ? <Check size={17} /> : <Share2 size={17} />}
        </button>
      </header>
      <section className="profile-card">
        {profile.avatarUrl ? <img className="profile-avatar" src={profile.avatarUrl} alt="" referrerPolicy="no-referrer" /> : <div className={`profile-avatar tone-${profile.tone}`}>{profile.name.slice(0, 1).toUpperCase()}</div>}
        <h2>{profile.displayName ?? profile.name}{profile.verificationBadge && <span className="verified-mark" aria-label="Подтверждённый аккаунт">✓</span>}</h2>
        <UnixLink username={profile.name} />
        <p className="context-copy">{profile.note}</p>
      </section>
      <section className="context-section profile-fields">
        <div>
          <span>Активность</span>
          <strong>{profile.activity}</strong>
        </div>
        <div>
          <span>Коллекция</span>
          <strong>{profile.gifts}</strong>
        </div>
      </section>
    </>
  )
}

function MarketContext({
  giftItem,
  copied,
  onCopy,
}: {
  giftItem: GiftRow
  copied: boolean
  onCopy: () => void
}) {
  return (
    <>
      <header className="context-head">
        <span>Рынок</span>
        <span className="context-symbol" aria-hidden="true">
          <ChevronsUpDown size={17} />
        </span>
      </header>
      <section className="market-focus">
        <span className={`gift-art large tone-${giftItem.tone}`}>
          {giftItem.imageUrl ? <img src={giftItem.imageUrl} alt="" referrerPolicy="no-referrer" /> : <><Gift size={34} /><b>{giftItem.mark}</b></>}
        </span>
        <h2>{giftItem.name}</h2>
        <span>{giftItem.owner === 'рынок UnixGram' ? giftItem.owner : <>владелец <UnixLink username={giftItem.owner} /></>}</span>
        <strong>{giftItem.price}</strong>
        <em>{giftItem.delta}</em>
        <div className="market-actions">
          <button type="button" onClick={onCopy}>
            {copied ? <Check size={17} /> : <Share2 size={17} />} {copied ? 'скопировано' : 'поделиться'}
          </button>
        </div>
      </section>

      <section className="context-section">
        <div className="context-title">
          <h3>Данные UnixGram</h3>
        </div>
        <div className="market-stat">
          <span>минимальная цена</span>
          <strong>{giftItem.price}</strong>
        </div>
        <div className="market-stat">
          <span>активных лотов</span>
          <strong>{giftItem.listingCount?.toLocaleString('ru-RU') ?? '—'}</strong>
        </div>
      </section>
      <p className="disclaimer">показываются только поля, полученные из текущего ответа UnixGram.</p>
    </>
  )
}

function SettingsContext({
  bootInfo,
  settings,
  section,
  onSection,
  onToggle,
  onRefresh,
  synced,
}: {
  bootInfo: BootInfo | null
  settings: SettingsState
  section: SettingsSection
  onSection: (section: SettingsSection) => void
  onToggle: (key: BooleanSettingKey) => void
  onRefresh: () => void
  synced: boolean
}) {
  return (
    <>
      <header className="context-head">
        <span>Состояние</span>
        <button className="icon-button" type="button" aria-label="Обновить состояние" onClick={onRefresh}>
          <RefreshCw size={18} />
        </button>
      </header>
      <section className="context-section server-status">
        <h3>Статусы серверов</h3>
        <div>
          <i className={synced ? 'is-ok' : 'is-watch'} />
          <span>
            <strong>UnixGram</strong>
            <small>профили, подарки и публикации</small>
          </span>
          <b>{synced ? 'ответил' : 'не проверено'}</b>
        </div>
        <div>
          <i className="is-watch" />
          <span>
            <strong>UnixPlace</strong>
            <small>торги и аукционы</small>
          </span>
          <b>{synced ? 'ожидаем лоты' : 'не проверено'}</b>
        </div>
        <div>
          <i className="is-ok" />
          <span>
            <strong>Desktop</strong>
            <small>{bootInfo?.status ?? 'подключение'}</small>
          </span>
          <b>{bootInfo?.channel ?? 'local'}</b>
        </div>
      </section>

      <section className="context-section">
        <h3>Быстрые настройки</h3>
        <ToggleRow title="Крупный текст" note="читать без увеличения" value={settings.largeText} onClick={() => onToggle('largeText')} />
        <ToggleRow title="Уведомления" note="важные события" value={settings.notifications} onClick={() => onToggle('notifications')} />
        <ToggleRow title="Единый поиск" note="поиск по всем сущностям" value={settings.unifiedSearchBeta} onClick={() => onToggle('unifiedSearchBeta')} />
      </section>

      <section className="context-section quick-links">
        <div className="context-title">
          <h3>Разделы настроек</h3>
          <span>{section}</span>
        </div>
        {settingsSections.slice(0, 4).map(({ id, label }) => (
          <button key={id} className={`quick-link ${section === id ? 'is-active' : ''}`} aria-current={section === id ? 'page' : undefined} type="button" onClick={() => onSection(id)}>
            <span>{label}</span>
            <ChevronRightSmall />
          </button>
        ))}
      </section>

      <section className="context-section support-card">
        <MessageSquareMore size={20} />
        <div>
          <strong>Нужна помощь?</strong>
          <p>связаться можно в сообщениях нашего канала</p>
          <a href="https://t.me/unixgramhistory?direct" target="_blank" rel="noreferrer">
            открыть сообщения
          </a>
        </div>
      </section>
      <p className="disclaimer">независимый клиент сообщества, без привязки к официальной команде UnixGram.</p>
    </>
  )
}

function ChevronRightSmall() {
  return <ChevronRight aria-hidden="true" />
}

function ChevronRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" {...props}>
      <path d="m7.5 4.5 5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function formatEventMeta(event: EventRow) {
  if (event.kind === 'передача') return `@${event.actor} → @${event.target}`
  if (event.kind === 'покупка') return `@${event.actor} купил у @${event.target}`
  if (event.kind === 'ставка') return `@${event.actor} поднял ставку · владелец @${event.target}`
  return `аккаунт @${event.actor}`
}

function giftModeDescription(mode: GiftMode) {
  if (mode === 'account') return 'коллекция и последние изменения выбранного профиля'
  if (mode === 'market') return 'активные лоты и движение цен всего рынка'
  if (mode === 'transfers') return 'последние передачи между аккаунтами'
  return 'самые крупные покупки с доступной подтверждённой ценой'
}

function bootInfoLabel(info: BootInfo | null) {
  if (!info) return 'гостевой режим'
  return `${info.channel} · ${info.protocol}`
}

function viewLabel(view: ViewId) {
  const labels: Record<ViewId, string> = {
    feed: 'лента',
    search: 'поиск',
    history: 'уведомления',
    messages: 'сообщения',
    people: 'сообщества',
    studio: 'студия',
    gifts: 'подарки',
    profile: 'профиль',
    premium: 'unix premium',
    settings: 'настройки',
  }
  return labels[view]
}

function isThemeId(value: string | null): value is ThemeId {
  return value === 'official-night'
    || value === 'official-light'
    || value === 'signal-ice'
    || value === 'ember'
    || value === 'aurora'
    || value === 'midnight-plum'
    || value === 'graphite'
    || value === 'mint-terminal'
    || value === 'sunset'
}

export default App
