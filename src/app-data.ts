export type ThemeId =
  | 'official-night'
  | 'official-light'
  | 'signal-ice'
  | 'ember'
  | 'aurora'
  | 'midnight-plum'
  | 'graphite'
  | 'mint-terminal'
  | 'sunset'

export type SectionId = 'history' | 'gifts' | 'settings'

export type GiftModeId = 'account' | 'market' | 'transfers' | 'top'

export type NavItem = {
  id: SectionId
  label: string
  hint: string
  badge: string
}

export type HistoryRow = {
  id: string
  title: string
  subtitle: string
  meta: string
  amount: string
  status: string
}

export type GiftMode = {
  id: GiftModeId
  label: string
}

export type GiftRow = {
  id: string
  mode: GiftModeId
  title: string
  owner: string
  note: string
  price: string
  change: string
}

export type ThemeCard = {
  id: ThemeId
  label: string
  note: string
}

export type StatusRow = {
  name: string
  state: 'healthy' | 'watch'
  note: string
}

export const navItems: NavItem[] = [
  { id: 'history', label: 'History', hint: 'профили, сделки, активность', badge: '24' },
  { id: 'gifts', label: 'Gifts', hint: 'рынок, передачи, топы', badge: '12' },
  { id: 'settings', label: 'Settings', hint: 'темы, статус, shell', badge: '4' },
]

export const historyRows: HistoryRow[] = [
  {
    id: 'basaltes',
    title: 'basaltes',
    subtitle: 'unixgram.com/basaltes',
    meta: 'обновлён 18:42 мск',
    amount: '1 240 000',
    status: 'крупная покупка',
  },
  {
    id: 'mummy',
    title: 'mummy',
    subtitle: 'unixgram.com/mummy',
    meta: 'новые подарки и посты',
    amount: '842 000',
    status: 'активный аккаунт',
  },
  {
    id: 'mkzk',
    title: 'mkzk',
    subtitle: 'unixgram.com/mkzk',
    meta: '3 передачи за час',
    amount: '415 000',
    status: 'рост цены',
  },
  {
    id: 'shadowfiend',
    title: 'shadowfiend',
    subtitle: 'unixgram.com/shadowfiend',
    meta: 'редкий лот поднял ставку',
    amount: '266 000',
    status: 'аукцион',
  },
]

export const giftModes: GiftMode[] = [
  { id: 'account', label: 'За аккаунтом' },
  { id: 'market', label: 'По рынку' },
  { id: 'transfers', label: 'Передачи' },
  { id: 'top', label: 'Топ покупок' },
]

export const giftRows: GiftRow[] = [
  {
    id: 'gift-1',
    mode: 'account',
    title: 'moon rabbit #018',
    owner: 'владелец: unixgram.com/mummy',
    note: 'покупка в профиле, после сделки сменился owner',
    price: '16 500 stars',
    change: '+18%',
  },
  {
    id: 'gift-2',
    mode: 'market',
    title: 'glass fox #204',
    owner: 'листинг: unixgram.com/market/glass-fox-204',
    note: 'рынок ожил, 4 ставки за 22 минуты',
    price: '9 200 stars',
    change: '+6%',
  },
  {
    id: 'gift-3',
    mode: 'transfers',
    title: 'retro bear #071',
    owner: 'передача: unixgram.com/shadowfiend',
    note: 'подарок ушёл между аккаунтами без продажи',
    price: 'без цены',
    change: 'transfer',
  },
  {
    id: 'gift-4',
    mode: 'top',
    title: 'lotus star #002',
    owner: 'покупатель: unixgram.com/basaltes',
    note: 'одна из самых крупных покупок недели',
    price: '47 000 stars',
    change: 'top 1',
  },
]

export const themeCards: ThemeCard[] = [
  { id: 'official-night', label: 'unixgram native', note: 'основная тема: максимально близко к web unixgram' },
  { id: 'graphite', label: 'messenger dark', note: 'более строгий тёмный режим для сообщений и долгого чтения' },
  { id: 'official-light', label: 'official light', note: 'светлая версия для длинного чтения' },
  { id: 'signal-ice', label: 'signal ice', note: 'холодный стеклянный режим' },
  { id: 'ember', label: 'ember', note: 'тёплый market-режим для подарков' },
  { id: 'aurora', label: 'aurora', note: 'северное сияние: бирюза и фиолетовый' },
  { id: 'midnight-plum', label: 'midnight plum', note: 'глубокая сливовая ночь без лишнего шума' },
  { id: 'mint-terminal', label: 'mint terminal', note: 'чистый тёмный режим с мятным сигналом' },
  { id: 'sunset', label: 'sunset', note: 'контрастный закатный акцент для рынка' },
]

export const statusRows: StatusRow[] = [
  { name: 'unixgram web', state: 'healthy', note: 'основная web-оболочка доступна' },
  { name: 'unixgram api', state: 'healthy', note: 'профили, подарки и посты отвечают' },
  { name: 'unixplace api', state: 'watch', note: 'рынок работает, но возможны задержки' },
]
